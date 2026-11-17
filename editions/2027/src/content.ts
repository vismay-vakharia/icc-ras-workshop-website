// All page content lives here. Edit this file; the page rebuilds from it.
// Empty lists (speakers, schedule, ...) show a "to be announced" note automatically.

export type Person = { name: string; affiliation: string; role?: string; url?: string };
export type Slot = { time: string; title: string; detail?: string };
export type Deadline = { label: string; date: string };

export const site = {
  conference: {
    name: 'Indian Control Conference 2027',
    short: 'ICC 2027',
    dates: '11–13 January 2027',
    url: 'https://controlsociety.org/icc/',
  },
  workshop: {
    title: 'Robotics and Autonomous Systems',
    format: 'Half-day workshop',
    date: 'To be announced',
    dateNote: 'During ICC 2027, 11–13 January',
    venue: 'IIT Kharagpur',
    venueNote: 'Kharagpur, West Bengal, India',
  },
  openreview: 'https://openreview.net/group?id=controlsociety.org/ICC/2027/Workshop/RAS',
  email: '', // e.g. 'name@example.com'; the footer shows it once filled in

  // Draft copy: rewrite freely.
  about: [
    'Robots and autonomous vehicles are control problems at heart: they sense, estimate, decide and act under uncertainty. This workshop brings together control theorists, roboticists and learning researchers working on how such systems are designed, analysed and deployed.',
    'The programme is still being planned. Invited talks, tutorials and discussion sessions will be added to this page as they are confirmed.',
  ],
  topics: [
    'Control and estimation for manipulators and mobile robots',
    'Motion planning and navigation in uncertain environments',
    'Learning-based and data-driven control',
    'Multi-robot and distributed autonomous systems',
    'Safety, robustness and verification',
    'Perception and sensor fusion for autonomy',
  ],

  deadlines: [] as Deadline[],
  schedule: [] as Slot[],
  speakers: [] as Person[],
  organizers: [] as Person[],

  previous: { label: '2025 edition', url: 'https://icc-ras-workshop.github.io/2025/' },
};
