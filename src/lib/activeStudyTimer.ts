export interface ActiveStudyTimer {
  pause: () => void;
  resume: () => void;
  reset: (active: boolean) => void;
  elapsedSeconds: (maximumSeconds?: number) => number;
}

export function createActiveStudyTimer(now:()=>number=()=>performance.now()):ActiveStudyTimer {
  let accumulatedMs=0;
  let startedAt:number|null=null;
  const pause=()=>{if(startedAt!==null){accumulatedMs+=Math.max(0,now()-startedAt);startedAt=null;}};
  const resume=()=>{if(startedAt===null)startedAt=now();};
  return {
    pause,
    resume,
    reset(active){accumulatedMs=0;startedAt=active?now():null;},
    elapsedSeconds(maximumSeconds=300){const current=accumulatedMs+(startedAt===null?0:Math.max(0,now()-startedAt));return Math.max(1,Math.min(maximumSeconds,Math.round(current/1000)));},
  };
}
