// Sample pipeline shared by the three pipeline mockups. Today is Monday 23 Nov 2026.
// One deal (Meridian Clinics intake forms) is shown mid-drag from Qualified to Proposal:
// `dragging` marks the lifted card, `slot` marks where it would land.
const STAGES = [
  { n: 'New', key: 'new', c: '#118AB2', p: 10, count: 4, total: 120000, deals: [
    { name: 'Fleet tracking', org: 'Harbor Logistics', v: 35000, date: '15 Feb 2027', contact: 'Sam Whitfield' },
    { name: 'Guest portal', org: 'Pinecrest Hotels', v: 35000, date: '28 Feb 2027', contact: 'Lucia Moreno' },
    { name: 'POS rollout', org: 'Solano Foods', v: 28000, date: '31 Mar 2027' },
    { name: 'Data audit', org: 'Corvus Analytics', v: 22000, date: '15 Mar 2027', contact: 'Ben Hartley' },
  ]},
  { n: 'Qualified', key: 'qualified', c: '#FFC145', p: 25, count: 4, total: 310000, deals: [
    { name: 'Group reporting', org: 'Northgate Finance', v: 110000, date: '29 Jan 2027', contact: 'Priya Raman' },
    { name: 'Clinic scheduling', org: 'Brightline Health', v: 95000, date: '12 Feb 2027', contact: 'Daniel Okafor' },
    { name: 'Intake forms', org: 'Meridian Clinics', v: 45000, date: '20 Nov 2026', contact: 'Grace Liu', late: true, dragging: true },
    { name: 'Loyalty app', org: 'Fernwood Retail', v: 60000, date: '20 Jan 2027', contact: 'Elena Fischer' },
  ]},
  { n: 'Proposal', key: 'proposal', c: '#F78C6B', p: 50, count: 3, total: 340000, target: true, deals: [
    { name: 'Shop-floor tablets', org: 'Kestrel Manufacturing', v: 140000, date: '18 Dec 2026', contact: 'Marco Bianchi' },
    { slot: true },
    { name: 'Warehouse sensors', org: 'Harbor Logistics', v: 120000, date: '22 Jan 2027', contact: 'Sam Whitfield' },
    { name: 'Support renewal', org: 'Larch Software', v: 80000, date: '14 Nov 2026', contact: 'Noah Stein', late: true },
  ]},
  { n: 'Negotiation', key: 'negotiation', c: '#073B4C', p: 75, count: 3, total: 360000, deals: [
    { name: 'Compliance suite', org: 'Northgate Finance', v: 180000, date: '11 Dec 2026', contact: 'Priya Raman' },
    { name: 'Booking engine', org: 'Pinecrest Hotels', v: 95000, date: '10 Nov 2026', contact: 'Lucia Moreno', late: true },
    { name: 'Telehealth add-on', org: 'Brightline Health', v: 85000, date: '30 Dec 2026', contact: 'Daniel Okafor' },
  ]},
  { n: 'Won', key: 'won', c: '#06D6A0', p: 100, count: 13, total: 668000, deals: [
    { name: 'Store analytics', org: 'Fernwood Retail', v: 86000, date: '18 Nov 2026', contact: 'Elena Fischer' },
    { name: 'Patient portal', org: 'Meridian Clinics', v: 63000, date: '14 Oct 2026', contact: 'Grace Liu' },
    { name: 'Maintenance plan', org: 'Kestrel Manufacturing', v: 112000, date: '22 Sep 2026', contact: 'Marco Bianchi' },
    { name: 'Route planning', org: 'Harbor Logistics', v: 54000, date: '19 Aug 2026', contact: 'Sam Whitfield' },
    { name: 'Staff app', org: 'Pinecrest Hotels', v: 29000, date: '8 Jul 2026', contact: 'Lucia Moreno' },
  ]},
  { n: 'Lost', key: 'lost', c: '#8FA3AA', p: 0, count: 3, total: 150000, deals: [
    { name: 'Supply dashboard', org: 'Solano Foods', v: 60000, date: '9 Sep 2026', contact: 'Tomas Silva' },
    { name: 'Analytics pilot', org: 'Corvus Analytics', v: 55000, date: '16 Jun 2026', contact: 'Ben Hartley' },
    { name: 'Team training', org: 'Larch Software', v: 35000, date: '12 Feb 2026' },
  ]},
];
const DRAGGED = STAGES.flatMap(s => s.deals).find(d => d.dragging);
