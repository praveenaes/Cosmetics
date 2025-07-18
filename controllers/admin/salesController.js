const Order=require('../../models/orderSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Brand=require('../../models/brandSchema');
const { errorMonitor } = require('nodemailer/lib/xoauth2');



const getSales = async (req, res) => {
  try {
    const range = req.query.range || "daily";
    const now = new Date();
    let startDate, endDate;

    if (range === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (range === "weekly") {
      const now = new Date();

      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    }
     else if (range === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "custom") {
      startDate = new Date(req.query.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.to);
      endDate.setHours(23, 59, 59, 999);
    }

    const orders = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdOn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" },
                totalDiscounts: { $sum: "$discount" },
                totalPrice: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalProducts: { $sum: { $size: "$orderedItems" } },
              },
            },
          ],
          monthlyStats: [
            {
              $group: {
                _id: { $month: "$createdOn" },
                netRevenue: { $sum: { $subtract: ["$totalPrice", "$discount"] } },
                orderCount: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 }, 
            },
          ],
        },
      },
      {
        $project: {
          totalSales: { $arrayElemAt: ["$overallStats.totalSales", 0] },
          totalDiscounts: { $arrayElemAt: ["$overallStats.totalDiscounts", 0] },
          totalPrice: { $arrayElemAt: ["$overallStats.totalPrice", 0] },
          totalOrders: { $arrayElemAt: ["$overallStats.totalOrders", 0] },
          totalProducts: { $arrayElemAt: ["$overallStats.totalProducts", 0] },
          monthlyStats: 1,
        },
      },
    ]);
    
    const stats = orders[0] || {
      totalSales: 0,
      totalDiscounts: 0,
      totalPrice: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthlyStats: [],
    };
    
    const netRevenue = stats.totalSales - stats.totalDiscounts;
    const averageOrderValue = stats.totalOrders > 0 ? stats.totalPrice / stats.totalOrders : 0;
    
    
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array(12).fill(0);
    const ordersCount = Array(12).fill(0);
    
    stats.monthlyStats.forEach((monthData) => {
      const index = monthData._id - 1; 
      sales[index] = monthData.netRevenue;
      ordersCount[index] = monthData.orderCount;
    });
    
 const salesData = {
  months: monthLabels,
  sales: sales.length ? sales : Array(12).fill(0),
  orders: ordersCount.length ? ordersCount : Array(12).fill(0),
};
   
    
    res.render("sales", {
      totalSales: stats.totalSales || 0,
      totalOrders: stats.totalOrders || 0,
      totalProducts: stats.totalProducts || 0,
      totalDiscounts: stats.totalDiscounts || 0,
      netRevenue: netRevenue || 0,
      averageOrderValue: averageOrderValue || 0,
      salesData,
      range,
      from: req.query.from,
      to: req.query.to,
    });
  } catch (error) {
    console.log('error in sales page rendering',error);
  }
};

const getSalesReport = async (req, res, next) => {
  try {
    const range = req.query.range || "daily";
    const now = new Date();
    let startDate, endDate;

    if (range === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (range === "weekly") {
      const now = new Date();

      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "custom") {
      startDate = new Date(req.query.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.to);
      endDate.setHours(23, 59, 59, 999);
    }

    const orders = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdOn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "users", 
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" },
                totalDiscounts: { $sum: "$discount" },
                totalPrice: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalProducts: { $sum: { $size: "$orderedItems" } },
              },
            },
          ],
          monthlyStats: [
            {
              $group: {
                _id: { $month: "$createdAt" },
                netRevenue: { $sum: { $subtract: ["$totalPrice", "$discount"] } },
                orderCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          detailedOrders: [
            {
              $sort: { createdOn: -1 },
            },
          ],
        },
      },
      {
        $project: {
          totalSales: { $arrayElemAt: ["$overallStats.totalSales", 0] },
          totalDiscounts: { $arrayElemAt: ["$overallStats.totalDiscounts", 0] },
          totalPrice: { $arrayElemAt: ["$overallStats.totalPrice", 0] },
          totalOrders: { $arrayElemAt: ["$overallStats.totalOrders", 0] },
          totalProducts: { $arrayElemAt: ["$overallStats.totalProducts", 0] },
          monthlyStats: 1,
          detailedOrders: 1,
        },
      },
    ]);
    
    
    const stats = orders[0] || {
      totalSales: 0,
      totalDiscounts: 0,
      totalPrice: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthlyStats: [],
      detailedOrders: [],
    };
    
    const netRevenue = stats.totalSales - stats.totalDiscounts;
    const averageOrderValue =
      stats.totalOrders > 0 ? stats.totalPrice / stats.totalOrders : 0;
    
    // Monthly data
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array(12).fill(0);
    const ordersCount = Array(12).fill(0);
    
    stats.monthlyStats.forEach((monthData) => {
      const index = monthData._id - 1;
      sales[index] = monthData.netRevenue;
      ordersCount[index] = monthData.orderCount;
    });
    
    const salesData = {
      months: monthLabels,
      sales,
      orders: ordersCount,
    };
    
    res.render("salesReport", {
      totalSales: stats.totalSales || 0,
      totalOrders: stats.totalOrders || 0,
      totalProducts: stats.totalProducts || 0,
      totalDiscounts: stats.totalDiscounts || 0,
      netRevenue: netRevenue || 0,
      averageOrderValue: averageOrderValue || 0,
      salesData: salesData || { months: [], sales: [], orders: [] },
      range,
      from: req.query.from,
      to: req.query.to,
      orders: stats.detailedOrders || [],
      startDate,
      endDate,
    });  
  } catch (error) {
    next(error);
  }
};

const getTopBrands = async (matchStage) => {
  const brandStats = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.product.brand": { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$orderedItems.product.brand", // group by brand name (string)
        totalQuantity: { $sum: "$orderedItems.quantity" },
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "_id", // brand name string
        foreignField: "brandName", // match by brand name
        as: "brand",
      },
    },
    { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        brandName: "$_id",
        brandImage: "$brand.brandImage",
        totalQuantity: 1,
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
  ]);

  return brandStats;
};


const getDashboard = async (req, res) => {
  try {
    const filter = req.query.filter || "daily";


    // Time range filtering
    const matchStage = { status: "delivered" };
    const now = new Date();

    if (filter === "daily") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchStage.createdOn = { $gte: startOfDay };
    } else if (filter === "weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); 
      startOfWeek.setHours(0, 0, 0, 0);
      matchStage.createdOn = { $gte: startOfWeek };
    } else if (filter === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchStage.createdOn = { $gte: startOfMonth };
    } else if (filter === "yearly") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      matchStage.createdOn = { $gte: startOfYear };
    }

    const topProducts = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.product._id",
          totalSold: { $sum: "$orderedItems.quantity" },
          name: { $first: "$orderedItems.product.productName" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Top Categories
    const topCategories = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.product.category",
          totalSold: { $sum: "$orderedItems.quantity" }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          name: "$category.name",
          totalSold: 1
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Top Brands
    const topBrands = await getTopBrands(matchStage);
    res.render("dashboard", {
      filter,
      topProducts,
      topCategories,
      topBrands
    });
  } catch (error) {
    console.log('error in rendering dashboard',error);
    
  }
};



module.exports={
getSales,
getSalesReport,
getDashboard
}