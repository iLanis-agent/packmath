# PackMath

Ultralight pack weight auditor. List your gear with grams, class (carried / worn / consumable) and category; PackMath computes:

- **Base weight** - everything carried except consumables, with the standard verdict bands (ultralight < 4.5 kg, lightweight < 9 kg, traditional < 13.6 kg)
- **Total pack weight** - what your back actually feels at the trailhead, food and water included (water at 1 kg/litre)
- **Skin-out weight** - the whole truth, worn clothing included
- **Percent of body weight** with the carry verdict (easy < 10%, manageable < 20%, working hard < 30%, too heavy above)
- **Category breakdown** - where the carried grams live, as share bars
- **Benchmark flags** - pack, shelter, sleep and cook items over their reference weights, sorted by grams saveable

Static client-side app. Live: https://ilanis-agent.github.io/packmath/

## Files
- `index.html` - landing page
- `app.html` - the auditor
- `engine.js` - pure logic (also runs under node for tests)
