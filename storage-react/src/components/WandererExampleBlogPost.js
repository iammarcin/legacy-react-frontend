import React from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './css/Wanderer.css'; // Assuming you might want similar styling
import HikeDetailMap from './WandererMap'; // Import the map component
import { photoDataList, trackPoints } from './WandererExampleMapData'; // Import map data

const markdown = `
# Into the Green: A Waterfall-Filled Wander Through Porto Moniz\n\nOn April 21st, 2025, I laced up my boots and set off on what turned out to be one of the most unforgettable hikes I\u2019ve done in Madeira \u2014 a 17.37 km trek through the lush, waterfall-laced trails of Porto Moniz. With a total elevation gain of over 500 meters and a max altitude of 1034 meters, this hike was a solid half-day adventure, clocking in at just over 4.5 hours. But stats aside, this trail was all about the vibe: green, serene, and soaked in natural beauty.\n\n## A Trail That Starts With a Whisper\n\nWe hit the trail around 10:30 AM, and right from the start, the forest wrapped around us like a green cocoon. The path was soft underfoot, damp from the morning mist, and the air smelled like moss and adventure. Levadas \u2014 those iconic Madeiran irrigation channels \u2014 ran alongside us for most of the way, their gentle trickling adding a soundtrack to our steps.\n\nBy early afternoon, we found ourselves deep in a forest that looked like it had been plucked straight from a fairytale. A small stream meandered through the trees, its clear water reflecting the canopy above. Ferns unfurled like green fireworks across the forest floor, and the whole scene was so peaceful it felt like time had slowed down.\n\n![A peaceful forest stream surrounded by ferns and towering trees](https://myaiappess3bucketnonprod.s3.eu-south-2.amazonaws.com/1/assets/chat/1/IMG_20250421_130522.jpg)\n\n## Waterfalls and Wonder\n\nAs we continued, the trail began to flirt with elevation. Around 2:55 PM, we stumbled upon a gentle waterfall cascading over mossy rocks. It wasn\u2019t huge, but it was perfect \u2014 the kind of spot that makes you want to sit down, breathe deep, and just listen.\n\n![A gentle waterfall tumbling over mossy rocks in a lush forest](https://myaiappess3bucketnonprod.s3.eu-south-2.amazonaws.com/1/assets/chat/1/IMG_20250421_145513.jpg)\n\nNot long after, we reached another waterfall \u2014 this one taller, with water trickling down a rugged cliff face. The rocks were dark and dramatic, and the surrounding greenery was so vibrant it almost didn\u2019t look real. The air was cool and damp, and the sound of the water was like nature\u2019s own meditation track.\n\n![A cascading waterfall flowing down a rocky cliff surrounded by vibrant greenery](https://myaiappess3bucketnonprod.s3.eu-south-2.amazonaws.com/1/assets/chat/1/IMG_20250421_151526.jpg)\n\n## The Final Stretch\n\nThe last leg of the hike was pure magic. The trail narrowed, hugging a moss-covered rock wall on one side and a narrow water channel on the other. It felt like walking through a secret passage carved by time and water.\n\n![A narrow trail beside a mossy rock wall and a quiet water channel](https://myaiappess3bucketnonprod.s3.eu-south-2.amazonaws.com/1/assets/chat/1/IMG_20250421_152515.jpg)\n\nJust before wrapping up around 3:07 PM, we wandered through a section of trail that looked like it had been swallowed by the forest. Towering trees, tangled underbrush, and a winding path made it feel like we were the only people on Earth.\n\n![A winding forest trail surrounded by dense, vibrant greenery](https://myaiappess3bucketnonprod.s3.eu-south-2.amazonaws.com/1/assets/chat/1/IMG_20250421_152944.jpg)\n\n## Final Thoughts\n\nThis hike had everything: waterfalls, levadas, lush forests, and just the right amount of challenge. The weather played nice too \u2014 a quick sprinkle of rain added to the rainforest vibe without soaking us. As I said in a voice note mid-hike, \u201cOne of the best hikes in Madeira.\u201d And I stand by that. If you ever find yourself in Porto Moniz with a few hours to spare and a thirst for nature, don\u2019t miss this trail. Just bring good shoes, a camera, and a sense of wonder.
`;

const WandererExampleBlogPost = () => {
  const rawHtml = marked(markdown);
  const sanitizedHtml = DOMPurify.sanitize(rawHtml);

  return (
    <div className="wanderer-example-blog-post" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/wanderer" className="link-to-generator">
          &larr; Back to Blog Generator
        </Link>
      </div>
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
      <HikeDetailMap trackPoints={trackPoints} photoDataList={photoDataList} />
      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center' }}>
        <Link to="/wanderer" className="link-to-generator">
          &larr; Back to Blog Generator
        </Link>
      </div>
    </div>
  );
};

export default WandererExampleBlogPost;

