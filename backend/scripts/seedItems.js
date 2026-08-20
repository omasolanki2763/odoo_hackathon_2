const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rewear');

// Import the Item model
const Item = require('../src/models/Item');
const User = require('../src/models/User');

async function seedItems() {
  try {
    console.log('🔄 Seeding sample items...');
    
    // Find a user to assign items to (or create one if needed)
    let user = await User.findOne({});
    if (!user) {
      console.log('❌ No users found. Please create a user account first.');
      process.exit(1);
    }
    
    console.log(`👤 Using user: ${user.username}`);
    
    // Sample items with working images
    const sampleItems = [
      {
        title: 'Denim Jacket',
        description: 'Classic blue denim jacket in excellent condition. Perfect for casual wear.',
        category: 'outerwear',
        condition: 'good',
        gender: 'unisex',
        size: 'M',
        pointsValue: 75,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Denim+Jacket+1',
            publicId: 'denim_jacket_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Denim+Jacket+2',
            publicId: 'denim_jacket_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['denim', 'jacket', 'casual', 'blue']
      },
      {
        title: 'Track Pants',
        description: 'Comfortable black track pants with elastic waistband. Great for workouts or casual wear.',
        category: 'bottoms',
        condition: 'like-new',
        gender: 'unisex',
        size: 'L',
        pointsValue: 60,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Track+Pants+1',
            publicId: 'track_pants_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Track+Pants+2',
            publicId: 'track_pants_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['track', 'pants', 'black', 'sporty']
      },
      {
        title: 'Summer Dress',
        description: 'Beautiful floral summer dress perfect for warm weather. Light and comfortable.',
        category: 'dresses',
        condition: 'good',
        gender: 'women',
        size: 'S',
        pointsValue: 80,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Summer+Dress+1',
            publicId: 'summer_dress_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['dress', 'summer', 'floral', 'casual']
      },
      {
        title: 'Winter Coat',
        description: 'Warm winter coat with faux fur hood. Perfect for cold weather.',
        category: 'outerwear',
        condition: 'excellent',
        gender: 'unisex',
        size: 'XL',
        pointsValue: 100,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Winter+Coat+1',
            publicId: 'winter_coat_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Winter+Coat+2',
            publicId: 'winter_coat_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['coat', 'winter', 'warm', 'hood']
      },
      {
        title: 'Casual Shirt',
        description: 'Comfortable cotton shirt in a neutral color. Versatile for any occasion.',
        category: 'tops',
        condition: 'good',
        gender: 'men',
        size: 'M',
        pointsValue: 50,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Casual+Shirt+1',
            publicId: 'casual_shirt_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['shirt', 'casual', 'cotton', 'neutral']
      },
      {
        title: 'Vintage Sweater',
        description: 'Cozy vintage sweater with a classic pattern. Perfect for chilly days.',
        category: 'tops',
        condition: 'fair',
        gender: 'women',
        size: 'L',
        pointsValue: 70,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Vintage+Sweater+1',
            publicId: 'vintage_sweater_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Vintage+Sweater+2',
            publicId: 'vintage_sweater_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['sweater', 'vintage', 'cozy', 'pattern']
      },
      {
        title: 'Designer Jeans',
        description: 'High-quality designer jeans with a perfect fit. Great for any casual occasion.',
        category: 'bottoms',
        condition: 'excellent',
        gender: 'unisex',
        size: '32',
        pointsValue: 90,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Designer+Jeans+1',
            publicId: 'designer_jeans_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['jeans', 'designer', 'quality', 'blue']
      },
      {
        title: 'Running Shoes',
        description: 'Comfortable running shoes with good support. Perfect for workouts or casual wear.',
        category: 'shoes',
        condition: 'good',
        gender: 'unisex',
        size: '10',
        pointsValue: 85,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Running+Shoes+1',
            publicId: 'running_shoes_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=Running+Shoes+2',
            publicId: 'running_shoes_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['shoes', 'running', 'comfortable', 'sporty']
      }
    ];
    
    // Clear existing items (optional - comment out if you want to keep existing items)
    // await Item.deleteMany({});
    // console.log('🗑️ Cleared existing items');
    
    // Add sample items
    for (const itemData of sampleItems) {
      const item = new Item({
        ...itemData,
        userId: user._id
      });
      
      await item.save();
      console.log(`✅ Added item: ${item.title}`);
    }
    
    console.log(`🎉 Successfully added ${sampleItems.length} sample items!`);
    console.log('📝 Items added:');
    sampleItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} (${item.pointsValue} points)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding items:', error);
    process.exit(1);
  }
}

seedItems(); 