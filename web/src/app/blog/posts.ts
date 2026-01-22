export type Post = {
  id: number;
  title: string;
  snippet: string;
  body: string;
  tags: string[];
  date: string;
  author: string;
  readTime: string;
};

export const posts: Post[] = [
  {
    id: 1,
    title: '5 Hair Care Tips for Summer',
    snippet: 'Keep your hair healthy in the heat.',
    body: `Summer can be tough on your hair. Sun, heat, humidity, and pool chemicals can leave it dry and dull.

Top tips:
- Use leave-in with UV protection.
- Deep condition weekly.
- Give hot tools a break.
- Rinse after pool or ocean.
- Hydrate well.

Book a maintenance cut to keep the shape fresh.`,
    tags: ['Hair Care', 'Summer', 'Tips'],
    date: 'Sep 14, 2024',
    author: 'Sarah Johnson',
    readTime: '5 min read',
  },
  {
    id: 2,
    title: 'The Latest Hair Color Trends for Fall',
    snippet: 'Warm caramels, burgundy, and subtle copper.',
    body: 'Warm tones dominate fall. Caramels for brightness, burgundy for contrast, and subtle coppers if you want something low key.',
    tags: ['Hair Color', 'Trends', 'Fall'],
    date: 'Sep 9, 2024',
    author: 'Team',
    readTime: '4 min read',
  },
  {
    id: 3,
    title: 'How to Choose the Perfect Haircut for Your Face Shape',
    snippet: 'Balance proportions with the right lines and layers.',
    body: 'Identify your face shape (oval, round, square) and use layers or volume to balance it. In doubt? Bring a reference photo to your visit.',
    tags: ['Haircuts', 'Face Shape', 'Styling'],
    date: 'Sep 4, 2024',
    author: 'Team',
    readTime: '6 min read',
  },
];
