/**
 * One-time migration script: Flat metadata fields → Nested metadata object
 *
 * This script:
 * 1. Migrates bills.json: moves flat metadata fields into nested `metadata` object
 * 2. Migrates incomes.json: same pattern
 * 3. Migrates month files: copies metadata from parent Bill/Income to each instance
 *
 * Run with: bun run api/src/scripts/migrate-metadata.ts
 */

import { readdir } from 'node:fs/promises';
import type { EntityMetadata, Bill, Income, BillInstance, IncomeInstance } from '../types';

const DATA_DIR = './data';
const ENTITIES_DIR = `${DATA_DIR}/entities`;
const MONTHS_DIR = `${DATA_DIR}/months`;

// Old flat structure (for migration)
interface OldBill extends Omit<Bill, 'metadata'> {
  bank_transaction_name?: string;
  account_number?: string;
  account_url?: string;
  notes?: string;
  metadata?: EntityMetadata; // May already be migrated
}

interface OldIncome extends Omit<Income, 'metadata'> {
  bank_transaction_name?: string;
  account_number?: string;
  account_url?: string;
  notes?: string;
  metadata?: EntityMetadata; // May already be migrated
}

interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  [key: string]: unknown;
}

async function loadJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  return await file.json();
}

async function saveJson(path: string, data: unknown): Promise<void> {
  await Bun.write(path, JSON.stringify(data, null, 2));
}

function extractMetadata(item: OldBill | OldIncome): EntityMetadata | undefined {
  // If already has nested metadata, use it
  if (item.metadata) {
    return item.metadata;
  }

  // Check if any flat fields exist
  const hasAnyMetadata =
    item.bank_transaction_name || item.account_number || item.account_url || item.notes;

  if (!hasAnyMetadata) {
    return undefined;
  }

  return {
    bank_transaction_name: item.bank_transaction_name,
    account_number: item.account_number,
    account_url: item.account_url,
    notes: item.notes,
  };
}

function migrateEntity(item: OldBill | OldIncome): Bill | Income {
  const metadata = extractMetadata(item);

  // Create new object without flat fields
  const {
    bank_transaction_name: _bank_transaction_name,
    account_number: _account_number,
    account_url: _account_url,
    notes: _notes,
    ...rest
  } = item;

  return {
    ...rest,
    metadata,
  } as Bill | Income;
}

async function migrateBills(): Promise<Map<string, EntityMetadata | undefined>> {
  const billsPath = `${ENTITIES_DIR}/bills.json`;
  console.log(`\nMigrating bills from ${billsPath}...`);

  const oldBills: OldBill[] = await loadJson(billsPath);
  const billMetadataMap = new Map<string, EntityMetadata | undefined>();

  const newBills = oldBills.map((bill) => {
    const migrated = migrateEntity(bill) as Bill;
    billMetadataMap.set(bill.id, migrated.metadata);
    return migrated;
  });

  await saveJson(billsPath, newBills);
  console.log(`  Migrated ${newBills.length} bills`);

  return billMetadataMap;
}

async function migrateIncomes(): Promise<Map<string, EntityMetadata | undefined>> {
  const incomesPath = `${ENTITIES_DIR}/incomes.json`;
  console.log(`\nMigrating incomes from ${incomesPath}...`);

  const oldIncomes: OldIncome[] = await loadJson(incomesPath);
  const incomeMetadataMap = new Map<string, EntityMetadata | undefined>();

  const newIncomes = oldIncomes.map((income) => {
    const migrated = migrateEntity(income) as Income;
    incomeMetadataMap.set(income.id, migrated.metadata);
    return migrated;
  });

  await saveJson(incomesPath, newIncomes);
  console.log(`  Migrated ${newIncomes.length} incomes`);

  return incomeMetadataMap;
}

async function migrateMonths(
  billMetadataMap: Map<string, EntityMetadata | undefined>,
  incomeMetadataMap: Map<string, EntityMetadata | undefined>
): Promise<void> {
  console.log(`\nMigrating month files from ${MONTHS_DIR}...`);

  const files = await readdir(MONTHS_DIR);
  const monthFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'));

  for (const file of monthFiles) {
    const monthPath = `${MONTHS_DIR}/${file}`;
    const monthData: MonthlyData = await loadJson(monthPath);

    let billInstancesUpdated = 0;
    let incomeInstancesUpdated = 0;

    // Update bill instances
    for (const instance of monthData.bill_instances) {
      if (instance.bill_id && !instance.is_adhoc && !instance.metadata) {
        const metadata = billMetadataMap.get(instance.bill_id);
        if (metadata) {
          instance.metadata = metadata;
          billInstancesUpdated++;
        }
      }
    }

    // Update income instances
    for (const instance of monthData.income_instances) {
      if (instance.income_id && !instance.is_adhoc && !instance.metadata) {
        const metadata = incomeMetadataMap.get(instance.income_id);
        if (metadata) {
          instance.metadata = metadata;
          incomeInstancesUpdated++;
        }
      }
    }

    await saveJson(monthPath, monthData);
    console.log(
      `  ${file}: ${billInstancesUpdated} bill instances, ${incomeInstancesUpdated} income instances updated`
    );
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Metadata Migration: Flat fields → Nested metadata object');
  console.log('='.repeat(60));

  try {
    // Step 1: Migrate bills and get metadata map
    const billMetadataMap = await migrateBills();

    // Step 2: Migrate incomes and get metadata map
    const incomeMetadataMap = await migrateIncomes();

    // Step 3: Migrate month files (add metadata to instances)
    await migrateMonths(billMetadataMap, incomeMetadataMap);

    console.log('\n' + '='.repeat(60));
    console.log('Migration complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  }
}

main();
