import { SavingsService } from '../../services/savings-service';
import { formatErrorForUser, getErrorStatus, ValidationError } from '../../utils/errors';

const savings = new SavingsService();

function monthFrom(request: Request): string {
  const month = new URL(request.url).pathname.match(/^\/api\/months\/(\d{4}-\d{2})\//)?.[1];
  if (!month) throw new ValidationError('Choose a valid budget month');
  return month;
}

function handler(action: (request: Request) => Promise<unknown>, status = 200) {
  return async (request: Request): Promise<Response> => {
    try {
      return Response.json(await action(request), { status });
    } catch (error) {
      return Response.json({ error: formatErrorForUser(error) }, { status: getErrorStatus(error) });
    }
  };
}

export const createSavingsMonthHandler = () =>
  handler((request) => savings.summary(monthFrom(request)));
export const createSavingsPlanHandler = () =>
  handler(async (request) => {
    const body = await request.json();
    if (!body || typeof body !== 'object') throw new ValidationError('Enter a savings plan');
    return savings.createPlan(body);
  }, 201);
