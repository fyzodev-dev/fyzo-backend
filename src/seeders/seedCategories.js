const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const categories = [
  // Health & Wellness
  { id: 'fitness', label: 'Fitness & Training', icon: 'barbell-outline', group: 'Health & Wellness', sortOrder: 1 },
  { id: 'yoga', label: 'Yoga & Meditation', icon: 'fitness-outline', group: 'Health & Wellness', sortOrder: 2 },
  { id: 'nutrition', label: 'Nutrition & Diet', icon: 'nutrition-outline', group: 'Health & Wellness', sortOrder: 3 },
  { id: 'mental-health', label: 'Mental Health & Therapy', icon: 'heart-outline', group: 'Health & Wellness', sortOrder: 4 },
  { id: 'wellness', label: 'Wellness & Self-Care', icon: 'sparkles-outline', group: 'Health & Wellness', sortOrder: 5 },
  
  // Business & Finance
  { id: 'business', label: 'Business & Entrepreneurship', icon: 'briefcase-outline', group: 'Business & Finance', sortOrder: 6 },
  { id: 'finance', label: 'Finance & Investing', icon: 'cash-outline', group: 'Business & Finance', sortOrder: 7 },
  { id: 'accounting', label: 'Accounting & Bookkeeping', icon: 'calculator-outline', group: 'Business & Finance', sortOrder: 8 },
  { id: 'real-estate', label: 'Real Estate', icon: 'home-outline', group: 'Business & Finance', sortOrder: 9 },
  { id: 'sales', label: 'Sales & Negotiation', icon: 'trending-up-outline', group: 'Business & Finance', sortOrder: 10 },
  
  // Creative Arts
  { id: 'photography', label: 'Photography & Videography', icon: 'camera-outline', group: 'Creative Arts', sortOrder: 11 },
  { id: 'design', label: 'Graphic Design', icon: 'color-palette-outline', group: 'Creative Arts', sortOrder: 12 },
  { id: 'music', label: 'Music & Audio Production', icon: 'musical-notes-outline', group: 'Creative Arts', sortOrder: 13 },
  { id: 'writing', label: 'Writing & Content Creation', icon: 'create-outline', group: 'Creative Arts', sortOrder: 14 },
  { id: 'art', label: 'Art & Illustration', icon: 'brush-outline', group: 'Creative Arts', sortOrder: 15 },
  
  // Technology & Development
  { id: 'programming', label: 'Programming & Development', icon: 'code-slash-outline', group: 'Technology & Development', sortOrder: 16 },
  { id: 'web-development', label: 'Web Development', icon: 'desktop-outline', group: 'Technology & Development', sortOrder: 17 },
  { id: 'mobile-dev', label: 'Mobile App Development', icon: 'phone-portrait-outline', group: 'Technology & Development', sortOrder: 18 },
  { id: 'data-science', label: 'Data Science & AI', icon: 'analytics-outline', group: 'Technology & Development', sortOrder: 19 },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: 'shield-checkmark-outline', group: 'Technology & Development', sortOrder: 20 },
  
  // Marketing & Media
  { id: 'marketing', label: 'Digital Marketing', icon: 'megaphone-outline', group: 'Marketing & Media', sortOrder: 21 },
  { id: 'social-media', label: 'Social Media Marketing', icon: 'share-social-outline', group: 'Marketing & Media', sortOrder: 22 },
  { id: 'seo', label: 'SEO & Content Marketing', icon: 'search-outline', group: 'Marketing & Media', sortOrder: 23 },
  { id: 'advertising', label: 'Advertising & Branding', icon: 'tv-outline', group: 'Marketing & Media', sortOrder: 24 },
  { id: 'public-relations', label: 'Public Relations', icon: 'chatbubbles-outline', group: 'Marketing & Media', sortOrder: 25 },
  
  // Education & Teaching
  { id: 'education', label: 'Education & Teaching', icon: 'school-outline', group: 'Education & Teaching', sortOrder: 26 },
  { id: 'language', label: 'Language Learning', icon: 'language-outline', group: 'Education & Teaching', sortOrder: 27 },
  { id: 'test-prep', label: 'Test Preparation', icon: 'document-text-outline', group: 'Education & Teaching', sortOrder: 28 },
  { id: 'tutoring', label: 'Academic Tutoring', icon: 'library-outline', group: 'Education & Teaching', sortOrder: 29 },
  
  // Lifestyle & Personal Development
  { id: 'lifestyle', label: 'Lifestyle & Personal Development', icon: 'star-outline', group: 'Lifestyle & Personal Development', sortOrder: 30 },
  { id: 'cooking', label: 'Cooking & Culinary Arts', icon: 'restaurant-outline', group: 'Lifestyle & Personal Development', sortOrder: 31 },
  { id: 'fashion', label: 'Fashion & Style', icon: 'shirt-outline', group: 'Lifestyle & Personal Development', sortOrder: 32 },
  { id: 'productivity', label: 'Productivity & Time Management', icon: 'time-outline', group: 'Lifestyle & Personal Development', sortOrder: 33 },
  { id: 'leadership', label: 'Leadership & Management', icon: 'people-outline', group: 'Lifestyle & Personal Development', sortOrder: 34 },
];

const seedCategories = async () => {
  try {
    console.log('🌱 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing categories...');
    await Category.deleteMany({});
    console.log('✅ Cleared existing categories');

    console.log('📝 Inserting categories...');
    const result = await Category.insertMany(categories);
    console.log(`✅ Successfully seeded ${result.length} categories`);

    console.log('\n📊 Categories by group:');
    const groups = await Category.aggregate([
      { $group: { _id: '$group', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    groups.forEach(group => {
      console.log(`   ${group._id}: ${group.count} categories`);
    });

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedCategories();
