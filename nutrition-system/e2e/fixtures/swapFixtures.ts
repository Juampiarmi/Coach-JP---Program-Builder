// Genera los archivos para e2e/swaps.mjs: app del alumno con un almuerzo de pollo + arroz yamaní (omnívoro) y los
// Service Workers reales (app en archivo y link fijo). Uso: tsx e2e/fixtures/swapFixtures.ts <carpeta>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAthleteHtml, buildPlanServiceWorker, buildPlanShell, buildServiceWorker } from '../../src/lib/exportHtml';
import { applyBankPlan } from '../../src/lib/planBank';
import { precalc } from '../../src/lib/precalc';
import { itemFromFood, seedPlan } from '../../src/lib/seed';

const dir = process.argv[2];
const p = seedPlan();
p.profile = { ...p.profile, sex: 'M', weightKg: 80, trainingDaysPerWeek: 7 };
p.anamnesis = { ...(p.anamnesis as NonNullable<typeof p.anamnesis>), allergies: [] };
const plan = applyBankPlan(p, precalc(p).sel);
const lunch = plan.meals.find((m) => m.role === 'lunch')!;
lunch.day = 'both';
lunch.title = 'Pollo grillado con arroz yamaní';
lunch.items = [itemFromFood('pollo', 180), itemFromFood('yamani', 220), itemFromFood('vegetales', 150), itemFromFood('oliva', 10)];
lunch.alts = undefined;
mkdirSync(join(dir, 'file'), { recursive: true });
mkdirSync(join(dir, 'plan'), { recursive: true });
writeFileSync(join(dir, 'file', 'index.html'), buildAthleteHtml(plan));
writeFileSync(join(dir, 'file', 'sw.js'), buildServiceWorker('e2e'));
writeFileSync(join(dir, 'plan', 'index.html'), buildPlanShell({ supabaseUrl: 'http://127.0.0.1:9', anonKey: 'e2e-anon-key-0000000000000000', basePath: '' }));
writeFileSync(join(dir, 'plan', 'sw.js'), buildPlanServiceWorker());
console.log(lunch.id);
