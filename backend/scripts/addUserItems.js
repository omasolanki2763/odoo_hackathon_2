const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rewear');

// Import the Item model
const Item = require('../src/models/Item');
const User = require('../src/models/User');

async function addUserItems() {
  try {
    console.log('🔄 Adding items to user account...');
    
    // Find the user (you can modify this to find by email or username)
    const user = await User.findOne({ email: 'aryan@gmail.com' });
    if (!user) {
      console.log('❌ User not found. Please check the email address.');
      process.exit(1);
    }
    
    console.log(`👤 Adding items for user: ${user.username} (${user.email})`);
    
    // Items to add to the user's account
    const userItems = [
      {
        title: 'My Track Pants',
        description: 'My comfortable black track pants with elastic waistband. Great for workouts or casual wear.',
        category: 'bottoms',
        condition: 'like-new',
        gender: 'unisex',
        size: 'L',
        pointsValue: 60,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=My+Track+Pants+1',
            publicId: 'my_track_pants_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=My+Track+Pants+2',
            publicId: 'my_track_pants_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['track', 'pants', 'black', 'sporty', 'my-item']
      },
      {
        title: 'My Denim Shirt',
        description: 'My classic blue denim shirt in excellent condition. Perfect for casual wear.',
        category: 'tops',
        condition: 'good',
        gender: 'unisex',
        size: 'M',
        pointsValue: 75,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=My+Denim+Shirt+1',
            publicId: 'my_denim_shirt_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          },
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=My+Denim+Shirt+2',
            publicId: 'my_denim_shirt_2',
            isPrimary: false,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['denim', 'shirt', 'casual', 'blue', 'my-item']
      },
      {
        title: 'My Vintage Sweater',
        description: 'My cozy vintage sweater with a classic pattern. Perfect for chilly days.',
        category: 'tops',
        condition: 'fair',
        gender: 'women',
        size: 'L',
        pointsValue: 70,
        status: 'available',
        images: [
          {
            url: 'https://dummyimage.com/400x400/7dd3fc/181a1b&text=My+Vintage+Sweater+1',
            publicId: 'my_vintage_sweater_1',
            isPrimary: true,
            width: 400,
            height: 400,
            size: 'placeholder'
          }
        ],
        tags: ['sweater', 'vintage', 'cozy', 'pattern', 'my-item']
      }
    ];
    
    // Add items to the user's account
    for (const itemData of userItems) {
      const item = new Item({
        ...itemData,
        userId: user._id
      });
      
      await item.save();
      console.log(`✅ Added item: ${item.title}`);
    }
    
    console.log(`🎉 Successfully added ${userItems.length} items to your account!`);
    console.log('📝 Your items:');
    userItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} (${item.pointsValue} points)`);
    });
    
    console.log('\n💡 Now you can test the swap functionality with these items!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding user items:', error);
    process.exit(1);
  }
}

addUserItems(); 