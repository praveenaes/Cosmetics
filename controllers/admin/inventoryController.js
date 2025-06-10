const Product=require('../../models/productSchema')

const getInventory = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = search
      ? {
          productName: { $regex: new RegExp(search, "i") },
        }
      : {};

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(query)
    .sort({createdAt:-1})
      .populate("category")
      .skip(skip)
      .limit(limit);

    res.render("inventory", {
      product: products,
      page,
      totalPages,
      search,
    });
  } catch (error) {
    console.log("Error in getInventory controller:", error);
    res.status(500).send("Internal Server Error");
  }
};



const updateInventory = async (req, res) => {
  try {

    const productId = req.query.id;
    const { quantity } = req.body;

    if (!productId || quantity === undefined || quantity < 0) {
      return res.status(400).json({ success: false, error: "Invalid product ID or quantity." });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { quantity: parseInt(quantity) },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("Error updating inventory:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};



  

module.exports={
    getInventory,
    updateInventory
}