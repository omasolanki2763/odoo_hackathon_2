require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Category = require('../src/models/Category');
const Swap = require('../src/models/Swap');
const Notification = require('../src/models/Notification');

const connectDB = require('../src/config/database');

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('📦 Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Item.deleteMany({});
    await Category.deleteMany({});
    await Swap.deleteMany({});
    await Notification.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create categories
    const categories = await Category.create([
      { name: 'Clothing', slug: 'clothing', description: 'All types of clothing items' },
      { name: 'Shoes', slug: 'shoes', description: 'Footwear for all occasions' },
      { name: 'Accessories', slug: 'accessories', description: 'Jewelry, bags, and other accessories' },
      { name: 'Electronics', slug: 'electronics', description: 'Gadgets and electronic items' },
      { name: 'Books', slug: 'books', description: 'Books and reading materials' },
      { name: 'Home & Garden', slug: 'home-garden', description: 'Home decor and garden items' }
    ]);
    console.log('📂 Created categories');

    // Create users
    const hashedPassword = await bcrypt.hash('Password123', 12);
    
    const users = await User.create([
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        profile: {
          bio: 'Fashion enthusiast who loves sustainable clothing',
          location: 'New York, NY',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        },
        preferences: {
          categories: [categories[0]._id, categories[1]._id],
          sizes: ['S', 'M', 'L'],
          notifications: {
            email: true,
            push: true
          }
        },
        points: 150,
        isAdmin: false
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        profile: {
          bio: 'Passionate about reducing waste through clothing exchange',
          location: 'Los Angeles, CA',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
        },
        preferences: {
          categories: [categories[0]._id, categories[2]._id],
          sizes: ['XS', 'S', 'M'],
          notifications: {
            email: true,
            push: false
          }
        },
        points: 200,
        isAdmin: false
      },
      {
        username: 'admin_user',
        email: 'admin@rewear.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        profile: {
          bio: 'Community moderator and admin',
          location: 'San Francisco, CA',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
        },
        preferences: {
          categories: categories.map(cat => cat._id),
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          notifications: {
            email: true,
            push: true
          }
        },
        points: 500,
        isAdmin: true
      },
      {
        username: 'mike_wilson',
        email: 'mike@example.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Wilson',
        profile: {
          bio: 'Tech enthusiast who loves sustainable living',
          location: 'Austin, TX',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
        },
        preferences: {
          categories: [categories[3]._id, categories[4]._id],
          sizes: ['M', 'L', 'XL'],
          notifications: {
            email: false,
            push: true
          }
        },
        points: 75,
        isAdmin: false
      }
    ]);
    console.log('👥 Created users');

    // Create items
    const items = await Item.create([
      {
        userId: users[0]._id,
        title: 'Blue Denim Jacket',
        description: 'Classic blue denim jacket in excellent condition. Size M, perfect for spring and fall.',
        category: 'outerwear',
        condition: 'like-new',
        size: 'M',
        brand: 'Levi\'s',
        gender: 'unisex',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400',
            isPrimary: true
          }
        ],
        status: 'available',
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA'
        },
        tags: ['denim', 'jacket', 'casual'],
        pointsValue: 50,
        style: ['casual', 'vintage']
      },
      {
        userId: users[1]._id,
        title: 'White Sneakers',
        description: 'Comfortable white sneakers, barely worn. Size 9, great for everyday use.',
        category: 'shoes',
        condition: 'good',
        size: '9',
        brand: 'Nike',
        gender: 'unisex',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
            isPrimary: true
          }
        ],
        status: 'available',
        location: {
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA'
        },
        tags: ['sneakers', 'casual', 'comfortable'],
        pointsValue: 40,
        style: ['casual', 'sporty']
      },
      {
        userId: users[2]._id,
        title: 'Leather Handbag',
        description: 'Elegant brown leather handbag with multiple compartments. Perfect for work or casual outings.',
        category: 'accessories',
        condition: 'like-new',
        size: 'One Size',
        brand: 'Coach',
        gender: 'women',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
            isPrimary: true
          }
        ],
        status: 'available',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'USA'
        },
        tags: ['handbag', 'leather', 'elegant'],
        pointsValue: 80,
        style: ['elegant', 'formal']
      },
      {
        userId: users[3]._id,
        title: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation. Great for work or exercise.',
        category: 'accessories',
        condition: 'good',
        size: 'One Size',
        brand: 'Sony',
        gender: 'unisex',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
            isPrimary: true
          }
        ],
        status: 'available',
        location: {
          city: 'Austin',
          state: 'TX',
          country: 'USA'
        },
        tags: ['headphones', 'wireless', 'audio'],
        pointsValue: 60,
        style: ['casual', 'sporty']
      },
      {
        userId: users[0]._id,
        title: 'Vintage T-Shirt',
        description: 'Cool vintage band t-shirt from the 90s. Size L, unique find for collectors.',
        category: 'tops',
        condition: 'fair',
        size: 'L',
        brand: 'Vintage',
        gender: 'unisex',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
            isPrimary: true
          }
        ],
        status: 'available',
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA'
        },
        tags: ['vintage', 'band', 'collector'],
        pointsValue: 25,
        style: ['vintage', 'casual']
      }
    ]);
    console.log('👕 Created items');

    // Create swaps
    const swaps = await Swap.create([
      {
        requesterId: users[1]._id,
        itemOwnerId: users[0]._id,
        itemId: items[0]._id, // Blue Denim Jacket
        type: 'swap',
        status: 'pending',
        message: 'I love this jacket! Would you be interested in swapping for my white sneakers?'
      },
      {
        requesterId: users[2]._id,
        itemOwnerId: users[3]._id,
        itemId: items[3]._id, // Wireless Headphones
        type: 'swap',
        status: 'accepted',
        message: 'These headphones would be perfect for my daily commute. I can offer my leather handbag in exchange.'
      },
      {
        requesterId: users[0]._id,
        itemOwnerId: users[1]._id,
        itemId: items[1]._id, // White Sneakers
        type: 'swap',
        status: 'rejected',
        message: 'I need comfortable shoes for my new job. Would you consider swapping for my programming books?'
      }
    ]);
    console.log('🔄 Created swaps');

    // Create notifications
    const notifications = await Notification.create([
      {
        userId: users[1]._id,
        type: 'swap_request',
        title: 'New Swap Request',
        message: 'Mike Wilson wants to swap your White Sneakers for his Programming Books Collection',
        data: {
          swapId: swaps[0]._id,
          itemId: items[1]._id
        },
        isRead: false
      },
      {
        userId: users[2]._id,
        type: 'swap_accepted',
        title: 'Swap Accepted',
        message: 'Your swap request for Wireless Headphones has been accepted!',
        data: {
          swapId: swaps[1]._id,
          itemId: items[3]._id
        },
        isRead: true
      },
      {
        userId: users[0]._id,
        type: 'swap_rejected',
        title: 'Swap Rejected',
        message: 'Your swap request for White Sneakers was declined',
        data: {
          swapId: swaps[2]._id,
          itemId: items[1]._id
        },
        isRead: false
      }
    ]);
    console.log('🔔 Created notifications');

    // Create points transactions
    const PointsTransaction = require('../src/models/PointsTransaction');
    const pointsTransactions = await PointsTransaction.create([
      {
        userId: users[0]._id,
        type: 'earned',
        amount: 50,
        balance: 150,
        description: 'Points earned for uploading Blue Denim Jacket',
        relatedItemId: items[0]._id,
        metadata: {
          source: 'item_upload',
          reason: 'New item uploaded'
        }
      },
      {
        userId: users[1]._id,
        type: 'earned',
        amount: 40,
        balance: 200,
        description: 'Points earned for uploading White Sneakers',
        relatedItemId: items[1]._id,
        metadata: {
          source: 'item_upload',
          reason: 'New item uploaded'
        }
      },
      {
        userId: users[2]._id,
        type: 'earned',
        amount: 80,
        balance: 500,
        description: 'Points earned for uploading Leather Handbag',
        relatedItemId: items[2]._id,
        metadata: {
          source: 'item_upload',
          reason: 'New item uploaded'
        }
      }
    ]);
    console.log('💰 Created points transactions');

    // Create admin actions
    const AdminAction = require('../src/models/AdminAction');
    const adminActions = await AdminAction.create([
      {
        adminId: users[2]._id, // admin_user
        targetType: 'item',
        targetId: items[0]._id,
        action: 'approve',
        reason: 'Item meets community guidelines',
        details: {
          previousStatus: 'pending',
          newStatus: 'available',
          notes: 'Approved by admin after review'
        }
      },
      {
        adminId: users[2]._id, // admin_user
        targetType: 'item',
        targetId: items[1]._id,
        action: 'approve',
        reason: 'Item meets community guidelines',
        details: {
          previousStatus: 'pending',
          newStatus: 'available',
          notes: 'Approved by admin after review'
        }
      }
    ]);
    console.log('👨‍💼 Created admin actions');

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${categories.length} categories`);
    console.log(`- ${users.length} users`);
    console.log(`- ${items.length} items`);
    console.log(`- ${swaps.length} swaps`);
    console.log(`- ${notifications.length} notifications`);
    console.log(`- ${pointsTransactions.length} points transactions`);
    console.log(`- ${adminActions.length} admin actions`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Regular User: john@example.com / Password123');
    console.log('Admin User: admin@rewear.com / Password123');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Test the registration endpoint');
    console.log('2. Login with the test credentials');
    console.log('3. Explore the items and swaps');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData(); 