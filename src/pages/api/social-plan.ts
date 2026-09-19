import { getWeekPlanWithDays } from "@src/turso";
import { mondayOf, nextMondayOf, isMonday, weekdayOf } from "@src/utils/socialPlanner";

// Consulta (solo lectura) del plan de redes: por defecto la semana actual y
// la siguiente, o la de ?week=YYYY-MM-DD (lunes). Incluye "needs", los
// cuentos que el plan dice que convendría crear, para que quien prepara los
// cuentos sepa qué hace falta y para cuándo. Un plan que no existe sale como
// null: esa semana se publica con la rotación de temas.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const week = url.searchParams.get("week");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

  if (week && !isMonday(week)) {
    return json({ error: `"${week}" no es un lunes (formato YYYY-MM-DD)` }, 400);
  }

  const withWeekdays = async (weekStart: string) => {
    const plan = await getWeekPlanWithDays(weekStart);
    return plan ? { ...plan, days: plan.days.map((day) => ({ weekday: weekdayOf(day.date), ...day })) } : null;
  };

  if (week) return json({ [week]: await withWeekdays(week) });

  const now = new Date();
  const [current, next] = await Promise.all([withWeekdays(mondayOf(now)), withWeekdays(nextMondayOf(now))]);
  return json({ currentWeek: current, nextWeek: next });
}
