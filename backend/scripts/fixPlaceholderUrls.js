const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rewear');

// Import the Item model
const Item = require('../src/models/Item');

async function fixPlaceholderUrls() {
  try {
    console.log('🔄 Fixing placeholder URLs...');
    
    // Find items with old placeholder URLs
    const items = await Item.find({
      $or: [
        { 'images.url': { $regex: 'via.placeholder.com' } },
        { 'images.url': { $regex: 'picsum.photos' } }
      ]
    });
    
    console.log(`📦 Found ${items.length} items with old placeholder URLs`);
    
    // Update each item
    for (const item of items) {
      let updated = false;
      
      if (item.images && item.images.length > 0) {
        for (let i = 0; i < item.images.length; i++) {
          const image = item.images[i];
          
          // Check if it's an old placeholder URL
          if (image.url && (image.url.includes('via.placeholder.com') || image.url.includes('picsum.photos'))) {
            // Replace with new placeholder URL
            item.images[i].url = `https://dummyimage.com/400x400/7dd3fc/181a1b&text=${item.title}+${i + 1}`;
            updated = true;
          }
        }
        
        if (updated) {
          await item.save();
          console.log(`✅ Updated item: ${item.title}`);
        }
      }
    }
    
    console.log('✅ All placeholder URLs fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing placeholder URLs:', error);
    process.exit(1);
  }
}

fixPlaceholderUrls(); 