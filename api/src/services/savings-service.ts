import { MonthsServiceImpl } from './months-service';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import { CategoriesServiceImpl } from './categories-service';
import { runWithDataAccess } from './data-access';
import { validateBudgetMonth } from './budget-updates-service';
import { createAdhocOccurrence } from '../utils/occurrences';
import {
  isSavingsAccount,
  isSpendingAccount,
  remainingLegacySavings,
  savingsEntries,
} from '../utils/savings';
import { NotFoundError, ReadOnlyError, ValidationError } from '../utils/errors';
import type { SavingsMonthSummary, SavingsPlanRequest } from '../types/budget-workflow';

export class SavingsService {
  private months = new MonthsServiceImpl();
  private accounts = new PaymentSourcesServiceImpl();
  private categories = new CategoriesServiceImpl();

  summary(month: string): Promise<SavingsMonthSummary> {
    return runWithDataAccess(async () => {
      validateBudgetMonth(month);
      const [data, accounts] = await Promise.all([
        this.months.getMonthlyData(month),
        this.accounts.getAll(),
      ]);
      const [year, monthNumber] = month.split('-').map(Number);
      const previousDate = new Date(year, monthNumber - 2, 1);
      const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
      const previous = await this.months.getMonthlyData(previousMonth);
      const ids = new Set(
        accounts
          .filter((account) => account.is_active && isSavingsAccount(account))
          .map((account) => account.id)
      );
      for (const id of Object.keys(data?.savings_balances_start ?? {})) ids.add(id);
      for (const id of Object.keys(data?.savings_balances_end ?? {})) ids.add(id);
      for (const id of Object.keys(data?.savings_contributions ?? {})) ids.add(id);
      for (const instance of [...(data?.bill_instances ?? []), ...(data?.income_instances ?? [])]) {
        if (instance.savings_account_id) ids.add(instance.savings_account_id);
      }
      return {
        month,
        exists: !!data,
        is_read_only: data?.is_read_only ?? false,
        spending_accounts: accounts.filter(isSpendingAccount).map(({ id, name }) => ({ id, name })),
        accounts: [...ids].map((id) => {
          const account = accounts.find((account) => account.id === id);
          const entries = data ? savingsEntries(data, id) : [];
          const planned = entries.reduce((sum, entry) => sum + entry.planned, 0);
          const legacy = data?.savings_contributions?.[id] ?? 0;
          return {
            id,
            name: account?.name ?? `Archived account (${id.slice(0, 8)})`,
            is_active: !!account?.is_active && isSavingsAccount(account),
            is_investment: account?.type === 'investment' || account?.is_investment === true,
            start: data?.savings_balances_start?.[id] ?? previous?.savings_balances_end?.[id],
            end: data?.savings_balances_end?.[id],
            planned,
            recorded: entries.reduce((sum, entry) => sum + entry.recorded, 0),
            unbudgeted_legacy: data?.excluded_budget_sources?.includes(`legacy-savings:${id}`)
              ? 0
              : remainingLegacySavings(legacy, planned),
            entries,
          };
        }),
      };
    });
  }

  createPlan(
    request: SavingsPlanRequest
  ): Promise<{ month: string; recurring: boolean; key?: string }> {
    return runWithDataAccess(async () => {
      const { month, amount, date, direction, recurring, savings_account_id, spending_account_id } =
        request;
      if (request.name !== undefined && typeof request.name !== 'string')
        throw new ValidationError('Enter a valid plan name');
      validateBudgetMonth(month);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw new ValidationError('Enter a positive amount in cents');
      if (!['contribution', 'withdrawal'].includes(direction) || typeof recurring !== 'boolean') {
        throw new ValidationError('Choose a contribution or withdrawal and its frequency');
      }
      if (typeof date !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)) {
        throw new ValidationError('Choose a valid date');
      }
      const [year, monthNumber, day] = date.split('-').map(Number);
      if (day < 1 || day > new Date(year, monthNumber, 0).getDate())
        throw new ValidationError('Choose a valid date');
      if (!recurring && !date.startsWith(`${month}-`))
        throw new ValidationError('Choose a date within this budget month');
      const accounts = await this.accounts.getAll();
      const destination = accounts.find(
        (account) =>
          account.id === savings_account_id && account.is_active && isSavingsAccount(account)
      );
      const spending = accounts.find(
        (account) => account.id === spending_account_id && isSpendingAccount(account)
      );
      if (!destination) throw new ValidationError('Choose an active savings or investment account');
      if (!spending || spending.id === destination.id)
        throw new ValidationError('Choose an active bank or cash account included in Budget');
      const data = recurring ? null : await this.months.getMonthlyData(month);
      if (!recurring && !data) throw new NotFoundError('Budget', month);
      if (data?.is_read_only) throw new ReadOnlyError(month);
      const category =
        direction === 'contribution'
          ? await this.categories.ensureGoalsCategoryExists()
          : await this.categories.ensureGoalCompletionsCategoryExists();
      const name =
        request.name?.trim() ||
        `${direction === 'contribution' ? 'Savings' : 'Withdrawal'}: ${destination.name}`;
      if (name.length > 100) throw new ValidationError('Name must be 100 characters or fewer');
      if (recurring) {
        const source = {
          name,
          amount,
          billing_period: 'monthly' as const,
          day_of_month: day,
          start_date: date,
          effective_from: date,
          payment_source_id: spending.id,
          savings_account_id: destination.id,
          category_id: category.id,
          payment_method: 'manual' as const,
        };
        const saved =
          direction === 'contribution'
            ? await new BillsServiceImpl().create(source)
            : await new IncomesServiceImpl().create(source);
        return {
          month,
          recurring,
          key: `${direction === 'contribution' ? 'bill' : 'income'}:${saved.id}`,
        };
      }
      const now = new Date().toISOString();
      const common = {
        id: crypto.randomUUID(),
        name,
        month,
        savings_account_id: destination.id,
        payment_source_id: spending.id,
        category_id: category.id,
        billing_period: 'monthly',
        expected_amount: amount,
        occurrences: [{ ...createAdhocOccurrence(date, amount), sequence: 1 }],
        is_default: false,
        is_adhoc: true,
        is_closed: false,
        created_at: now,
        updated_at: now,
      };
      if (direction === 'contribution') data!.bill_instances.push({ ...common, bill_id: null });
      else data!.income_instances.push({ ...common, income_id: null });
      data!.updated_at = now;
      await this.months.saveMonthlyData(month, data!);
      return { month, recurring };
    });
  }
}
