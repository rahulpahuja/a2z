import { bold, doc, h2, li, p, ul } from './_doc.mjs';

export default {
  id: 'blog_find_your_size_online',
  categoryName: 'Buying guide',
  post: {
    type: 'general',
    title: 'How to Find Your Size When Shopping Online',
    slug: 'how-to-find-your-size-online',
    author: 'A2Z Collection',
    excerpt: 'Ordering clothes online is easier when you measure first. A short guide to measuring yourself and reading a size chart.',
    tags: ['size guide', 'buying guide', 'online shopping', 'fit'],
    seoTitle: 'How to Find Your Size When Shopping Online',
    seoDescription: 'Measure yourself, compare with the size chart and read the fit notes: a simple guide to choosing the right size when you buy clothes online.',
    body: doc(
      p('The size on a label is only a starting point. Brands cut clothes differently, and a baggy or oversized style is meant to fit loosely. Measuring yourself and comparing the numbers with the size chart is the most reliable way to order the right size the first time.'),
      h2('What you need'),
      p('A soft measuring tape, a mirror or a friend to help, and a few minutes. Wear light, close-fitting clothes so the numbers are accurate.'),
      h2('The measurements that matter'),
      ul(
        li(bold('Chest or bust: '), 'around the fullest part, keeping the tape level and snug but not tight.'),
        li(bold('Waist: '), 'around the narrowest part of your torso, usually just above the navel.'),
        li(bold('Hips: '), 'around the fullest part of your hips and seat.'),
        li(bold('Length: '), 'for trousers, the inseam from the crotch to where you want the hem; for tops and jackets, from the shoulder to where you want it to end.'),
      ),
      h2('Reading the size chart'),
      p('Find each of your measurements in the chart and see which size it falls in. If you are between two sizes, think about how the garment is meant to fit: choose the smaller size for a close fit, and the larger one if you prefer more room or plan to layer.'),
      h2('Read the product description too'),
      p('The description tells you the intended fit, such as regular, relaxed or oversized. A relaxed or oversized style will feel looser than the same size in a regular cut, so a size that matches your measurements is often right and sizing up may not be needed.'),
      h2('A quick checklist before you order'),
      ul(
        li('Measure yourself and write the numbers down.'),
        li('Compare them with the size chart for that product.'),
        li('Check the fit notes in the description.'),
        li('Read the return and exchange policy so you know what to expect.'),
      ),
      p('Our size chart page lists the measurements for each size. Start there, and contact us if you are unsure which size to choose.'),
    ),
  },
};
