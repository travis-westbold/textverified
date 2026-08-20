export interface DemoService {
  name: string;
  mark: string;
  color: string;
  number: string;
}

export const demoServices: DemoService[] = [
  { name: 'Tinder', mark: 'T', color: 'linear-gradient(140deg,#ff6b6b,#e0245e)', number: '+1 (415) 555-0142' },
  { name: 'Uber', mark: 'U', color: 'linear-gradient(140deg,#3d3d3d,#000)', number: '+1 (312) 555-0198' },
  { name: 'PayPal', mark: 'P', color: 'linear-gradient(140deg,#2790f0,#003087)', number: '+1 (646) 555-0117' },
  { name: 'DoorDash', mark: 'D', color: 'linear-gradient(140deg,#ff5a3c,#c1272d)', number: '+1 (206) 555-0163' },
  { name: 'Walmart', mark: 'W', color: 'linear-gradient(140deg,#41a6f6,#0071ce)', number: '+1 (713) 555-0129' },
];
