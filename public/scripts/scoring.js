// Shared by browser and Worker: no time-played bonus. Scores are client-reported, not verified cities.
export function scoreCity({population,happiness,treasury,employment,milestones}) {
 return Math.floor(population*10 + happiness*20 + employment*10 + Math.min(100000,Math.max(0,treasury))/100 + milestones*1000);
}
export function summary(state) {
 return {population:Math.floor(state.population),happiness:Math.round(state.stats.happiness),treasury:Math.round(state.treasury),employment:Math.round(state.stats.employment),milestones:state.milestones.length};
}
