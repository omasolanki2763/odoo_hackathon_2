const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rewear');

// Import the Item model
const Item = require('../src/models/Item');

async function updateImages() {
  try {
    console.log('🔄 Updating existing items with placeholder images...');
    
    // Get all items
    const items = await Item.find({});
    console.log(`📦 Found ${items.length} items to update`);
    
    // Update each item with placeholder images
    for (const item of items) {
      if (!item.images || item.images.length === 0) {
        // Add placeholder images based on item category
        const placeholderImages = [];
        
        // Generate 2-3 placeholder images per item
        const numImages = Math.floor(Math.random() * 2) + 2; // 2-3 images
        
        for (let i = 0; i < numImages; i++) {
          placeholderImages.push({
            url: `https://dummyimage.com/400x400/7dd3fc/181a1b&text=${item.title}+${i + 1}`,
            publicId: `placeholder_${item._id}_${i}`,
            isPrimary: i === 0,
            width: 400,
            height: 400,
            size: 'placeholder'
          });
        }
        
        item.images = placeholderImages;
        await item.save();
        
        console.log(`✅ Updated item: ${item.title} with ${placeholderImages.length} images`);
      }
    }
    
    console.log('✅ All items updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating images:', error);
    process.exit(1);
  }
}

updateImages(); 