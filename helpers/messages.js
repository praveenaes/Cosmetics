const Messages = {
    REQUIRED_FIELDS: "Percentage and category ID are required.",
    PRODUCT_EXISTS: "Product with this name already exists. Please try another name.",
    INVALID_CREDENTIALS: "Invalid username or password.",
    USER_NOT_FOUND: "User not found.",
    UNAUTHORIZED_ACCESS: "You are not authorized to perform this action.",

    //category
    NAME_DESCRIPTION_REQUIRED: "Name and description are required",
    CATEGORY_EXISTS: "Category already exists",
    CATEGORY_ADDED: "Category added successfully",
    REQUIRED_FIELDS: "Percentage and category ID are required.",
    PERCENTAGE_RANGE: "Percentage must be between 1 and 100.",
    CATEGORY_NOT_FOUND: "Category not found.",
    PRODUCT_OFFER_CONFLICT: "Products within this category already have a product-specific offer greater than the category offer.",
    OFFER_ADDED_SUCCESSFULLY: (percentage) => `Offer of ${percentage}% added successfully.`,
    CATEGORY_ID_REQUIRED: "Category ID is required.",
    OFFER_REMOVED_SUCCESSFULLY: "Offer removed successfully.",
    CATEGORY_UPDATED_SUCCESSFULLY: "Category updated successfully",

    //coupon
    COUPON_EXISTS: "Coupon with this name already exists",
    COUPON_ADDED_SUCCESSFULLY: "Coupon added successfully",
    COUPON_ADD_FAILED: "Failed to add coupon.",
    COUPON_UPDATED_SUCCESSFULLY: "Updated successfully",
    COUPON_UPDATE_FAILED: "Failed to update coupon",
    COUPON_DELETED: "Coupon deleted",
    COUPON_DELETE_FAILED: "Failed to delete coupon.",
    COUPON_DISCOUNT_REQUIRED: "Either offer price or discount percentage is required",
    COUPON_MAX_AMOUNT_REQUIRED: "Max discount amount is required when percentage is provided",
    COUPON_TYPE_CONFLICT: "Choose either fixed or percentage discount, not both",
    COUPON_DATE_INVALID: "Expire date must be after created date",
    INVALID_COUPON_DATA: "All required fields must be filled correctly",
    OFFER_PRICE_OR_DISCOUNT_REQUIRED: "Either offerPrice or discountPercentage is required.",
    MAX_DISCOUNT_REQUIRED: "maxDiscountAmount is required when discountPercentage is provided.",

    
    //admin order controller
    ORDER_NOT_FOUND: "Order not found",
    ORDER_UPDATED_SUCCESSFULLY: "Order updated successfully",
    ORDER_CANCELLED_SUCCESSFULLY: "Order cancelled successfully",
    PRODUCT_CANCELLED_SUCCESSFULLY: "Product cancelled successfully",
    RETURN_SUCCESSFUL: "Returning successfully",
    ORDER_NOT_FOUND: "Order not found",
    RETURNED_SUCCESSFULLY: "Returned successfully",

    //product controller
    ONLY_IMAGE_FILES_ALLOWED: "Only image files are allowed.",
    IMAGE_UPLOAD_REQUIRED: "Please upload at least one image.",
    ONLY_IMAGE_FILES_ALLOWED: "Only image files are allowed.",
    PRODUCT_EXISTS: "Product already exists",
    PRODUCT_ADDED_SUCCESSFULLY: "Product added successfully!",
    PRODUCT_NOT_FOUND: "Product not found",
    PRODUCT_HAS_CATEGORY_OFFER: (offer) => `This product already has a ${offer}% category offer`,
    STOCK_UPDATED: "Stock updated successfully",
    STOCK_UPDATE_FAILED: "Stock updation failed",
    PRODUCT_EDITED_SUCCESSFULLY: "Product edited successfully",

    //cart controller
    PRODUCT_NOT_AVAILABLE: "Product not currently available",
    ONLY_STOCK_AVAILABLE: (qty) => `We have only ${qty} in stock`,
    MAX_CART_LIMIT_REACHED: "You have reached the maximum limit for this product in your cart.",
    PRODUCT_ADDED_TO_CART: "Product added to cart",
    CART_NOT_FOUND: "Cart not found",
    CART_UPDATED: "Updated successfully",
    PRODUCT_NOT_IN_CART: "Product not found in cart",
    PRODUCT_REMOVED: "Product removed successfully",

    //brand conroller
    BANNER_DELETED: "Banner deleted successfully",
    BRAND_ALREADY_EXISTS: "Brand already exists.",
    BRAND_ADDED: "Brand added successfully!",
    BRAND_NOT_FOUND: "Brand not found",
    BRAND_NAME_EXISTS: "Brand name already exists",
    BRAND_UPDATED: "Brand updated successfully!",

    //checkout controller
    INVALID_COUPON_CODE: "Invalid coupon code",
    COUPON_MINIMUM_PRICE_REQUIRED: (price) => `You need to have items worth ${price} to apply this coupon`,
    COUPON_ALREADY_USED: "You have already used this coupon.",
    


    //order controller
    ORDER_PLACED: "Order placed successfully",
    COD_LIMIT_EXCEEDED: "Cash on delivery is not applicable for amount above ₹1000!",
    INSUFFICIENT_WALLET_BALANCE: (balance) => `You only have ₹ ${balance} in your wallet!`,
    WALLET_NOT_FOUND: "Wallet not found",
    ORDER_NOT_FOUND: "Order not Found",
    RETURN_REQUEST_CANCELLED: "Return request cancelled",
    INVALID_PAYMENT_SIGNATURE: "Invalid payment signature",
    PAYMENT_SUCCESSFUL: "Payment successful",
    PAYMENT_FAILED:'Payment failed',
    RETURN_APPROVED_SUCCESSFULLY: "Return approved successfully",
    RETURN_REQUEST_REJECTED:"return request rejected",
    PAYMENT_SERVICE_UNAVAILABLE: "Payment service temporarily unavailable. Please try again later.",
    INSUFFICIENT_STOCK: (name, qty) => `The product "${name}" has only ${qty} items in stock.`,
    PRODUCT_BLOCKED:(name)=>`Currently ${name} is not available`,
    ORDER_CANCELLED_SUCCESSFULLY:'Order cancel success'

  };
  
  module.exports = Messages;
  