import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Sector 12, Pune area (approximate center)
const CENTER_LAT = 18.5204
const CENTER_LNG = 73.8567

const millsData = [
  {
    name: "Annapurna Chakki",
    ownerName: "Ramesh Patel",
    phone: "9111111111",
    userName: "Ramesh Patel",
    address: "Shop 4, Gandhi Market, Sector 12",
    lat: CENTER_LAT + 0.007,
    lng: CENTER_LNG + 0.005,
    rating: 4.8,
    reviews: 1240,
    deliveryFee: 15,
    specialties: "Whole Wheat,Multigrain,Bajra",
    yearsActive: 22,
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  },
  {
    name: "Shree Ganesh Flour Mill",
    ownerName: "Sunita Sharma",
    phone: "9222222222",
    userName: "Sunita Sharma",
    address: "Near Bus Stand, Old Town Road",
    lat: CENTER_LAT + 0.012,
    lng: CENTER_LNG - 0.008,
    rating: 4.6,
    reviews: 860,
    deliveryFee: 20,
    specialties: "Jowar,Rice Flour,Besan",
    yearsActive: 15,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  },
  {
    name: "Kisan Stone Mill",
    ownerName: "Harpreet Singh",
    phone: "9333333333",
    userName: "Harpreet Singh",
    address: "Plot 18, Green Valley, Phase 2",
    lat: CENTER_LAT - 0.018,
    lng: CENTER_LNG + 0.015,
    rating: 4.9,
    reviews: 2100,
    deliveryFee: 25,
    specialties: "Corn,Wheat,Turmeric",
    yearsActive: 30,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
    isOpen: false,
  },
  {
    name: "Gram Daana Atta House",
    ownerName: "Lakshmi Reddy",
    phone: "9444444444",
    userName: "Lakshmi Reddy",
    address: "12 Market Lane, Lake Garden",
    lat: CENTER_LAT + 0.025,
    lng: CENTER_LNG + 0.02,
    rating: 4.5,
    reviews: 540,
    deliveryFee: 30,
    specialties: "Multigrain,Besan,Rice Flour",
    yearsActive: 8,
    image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600&q=80",
  },
]

const grainsData = [
  {
    name: "Whole Wheat",
    localName: "Gehu",
    category: "WHEAT",
    pricePerKg: 42,
    grindingFeePerKg: 4,
    image: "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&q=80",
    description: "Sharbati whole wheat, stone-ground fresh for soft rotis.",
    popular: true,
    subTypes: JSON.stringify(["Sharbati", "Lokwan", "MP Wheat"]),
  },
  {
    name: "Multigrain Mix",
    localName: "Multigrain Atta",
    category: "WHEAT",
    pricePerKg: 58,
    grindingFeePerKg: 5,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
    description: "Wheat, barley, soy, and oats blend for everyday nutrition.",
    popular: true,
    subTypes: null,
  },
  {
    name: "Pearl Millet",
    localName: "Bajra",
    category: "MILLET",
    pricePerKg: 48,
    grindingFeePerKg: 5,
    image: "https://images.unsplash.com/photo-1631209121750-a9f656d28de6?w=400&q=80",
    description: "Iron-rich pearl millet, perfect for winter bhakri.",
    popular: false,
    subTypes: null,
  },
  {
    name: "Sorghum",
    localName: "Jowar",
    category: "MILLET",
    pricePerKg: 52,
    grindingFeePerKg: 5,
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80",
    description: "Gluten-free sorghum flour, light and wholesome.",
    popular: true,
    subTypes: null,
  },
  {
    name: "Rice Flour",
    localName: "Chawal Atta",
    category: "RICE",
    pricePerKg: 46,
    grindingFeePerKg: 6,
    image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&q=80",
    description: "Fine rice flour for dosa, idli, and snacks.",
    popular: false,
    subTypes: null,
  },
  {
    name: "Gram Flour",
    localName: "Besan",
    category: "PULSES",
    pricePerKg: 88,
    grindingFeePerKg: 7,
    image: "https://images.unsplash.com/photo-1612257416648-3c7f5b8b4d2e?w=400&q=80",
    description: "Stone-milled chana dal for pakoras and sweets.",
    popular: false,
    subTypes: null,
  },
  {
    name: "Corn Flour",
    localName: "Makki Atta",
    category: "CORN",
    pricePerKg: 50,
    grindingFeePerKg: 5,
    image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80",
    description: "Golden maize flour for makki di roti.",
    popular: false,
    subTypes: null,
  },
  {
    name: "Turmeric",
    localName: "Haldi",
    category: "SPICES",
    pricePerKg: 220,
    grindingFeePerKg: 12,
    image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80",
    description: "Pure sun-dried turmeric, ground fresh to order.",
    popular: false,
    subTypes: null,
  },
]

async function main() {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.millProduct.deleteMany()
  await prisma.mill.deleteMany()
  await prisma.deliveryPartner.deleteMany()
  await prisma.address.deleteMany()
  await prisma.grain.deleteMany()
  await prisma.otpCode.deleteMany()
  await prisma.user.deleteMany()

  const grains = await Promise.all(grainsData.map((g) => prisma.grain.create({ data: g })))

  // Customer
  const customer = await prisma.user.create({
    data: {
      phone: "9876543210",
      name: "Aarav Mehta",
      role: "CUSTOMER",
      isFirstTime: false,
      addresses: {
        create: {
          label: "Home",
          line1: "B-204, Sunrise Apartments, Sector 12",
          lat: CENTER_LAT,
          lng: CENTER_LNG,
          isDefault: true,
        },
      },
    },
  })

  const mills = []
  for (const m of millsData) {
    const owner = await prisma.user.create({
      data: {
        phone: m.phone,
        name: m.userName,
        role: "MILL_OWNER",
        isFirstTime: false,
      },
    })
    const mill = await prisma.mill.create({
      data: {
        ownerId: owner.id,
        name: m.name,
        ownerName: m.ownerName,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        isOpen: m.isOpen ?? true,
        rating: m.rating,
        reviews: m.reviews,
        deliveryFee: m.deliveryFee,
        specialties: m.specialties,
        yearsActive: m.yearsActive,
        image: m.image,
        deliveryRadiusKm: 8,
      },
    })
    mills.push(mill)

    for (const grain of grains.slice(0, 6)) {
      await prisma.millProduct.create({
        data: {
          millId: mill.id,
          grainId: grain.id,
          customPrice: grain.pricePerKg,
          customGrindingFee: grain.grindingFeePerKg,
          inStock: true,
        },
      })
    }
  }

  // Delivery partner
  const riderUser = await prisma.user.create({
    data: {
      phone: "9876511223",
      name: "Suresh Kumar",
      role: "DELIVERY",
      isFirstTime: false,
    },
  })
  const rider = await prisma.deliveryPartner.create({
    data: {
      userId: riderUser.id,
      vehicleInfo: "Hero Splendor · MH 12 AB 4567",
      isOnline: true,
      currentLat: CENTER_LAT + 0.003,
      currentLng: CENTER_LNG + 0.002,
      rating: 4.9,
      trips: 1420,
    },
  })

  const mill1 = mills[0]

  await prisma.order.create({
    data: {
      displayId: "ORD-7841",
      customerId: customer.id,
      millId: mill1.id,
      status: "GRINDING",
      address: "B-204, Sunrise Apartments, Sector 12",
      addressLat: CENTER_LAT,
      addressLng: CENTER_LNG,
      total: 655,
      deliveryFee: 15,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      items: {
        create: [
          {
            grainId: grains[0].id,
            grainName: "Whole Wheat (Gehu)",
            subType: "Sharbati",
            quantityKg: 10,
            texture: "MEDIUM",
            roasted: false,
            pricePerKg: 42,
            grindingFeePerKg: 4,
          },
          {
            grainId: grains[7].id,
            grainName: "Turmeric (Haldi)",
            quantityKg: 1,
            texture: "FINE",
            roasted: false,
            pricePerKg: 220,
            grindingFeePerKg: 12,
          },
        ],
      },
    },
  })

  await prisma.order.create({
    data: {
      displayId: "ORD-7838",
      customerId: customer.id,
      millId: mill1.id,
      status: "PLACED",
      address: "Flat 7, Rose Villa, Sector 11",
      addressLat: CENTER_LAT + 0.008,
      addressLng: CENTER_LNG - 0.005,
      total: 305,
      deliveryFee: 15,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      items: {
        create: [
          {
            grainId: grains[1].id,
            grainName: "Multigrain Atta",
            quantityKg: 5,
            texture: "FINE",
            roasted: false,
            pricePerKg: 58,
            grindingFeePerKg: 5,
          },
        ],
      },
    },
  })

  // A READY order so delivery job board has something to show
  await prisma.order.create({
    data: {
      displayId: "ORD-7830",
      customerId: customer.id,
      millId: mill1.id,
      status: "READY",
      address: "House 22, Garden Colony",
      addressLat: CENTER_LAT + 0.012,
      addressLng: CENTER_LNG + 0.008,
      total: 399,
      deliveryFee: 15,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      items: {
        create: [
          {
            grainId: grains[2].id,
            grainName: "Pearl Millet (Bajra)",
            quantityKg: 8,
            texture: "COARSE",
            roasted: true,
            pricePerKg: 48,
            grindingFeePerKg: 5,
          },
        ],
      },
    },
  })

  console.log("✅ Seed complete:")
  console.log("  Customer login: 9876543210")
  console.log("  Mill owner login: 9111111111 (Annapurna Chakki)")
  console.log("  Rider login: 9876511223")
  console.log(`  Center coords: ${CENTER_LAT}, ${CENTER_LNG}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
