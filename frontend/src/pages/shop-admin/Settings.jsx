import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  FileText,
  Percent,
  Save,
  Settings as SettingsIcon,
  Receipt,
  Phone,
  Mail,
} from "lucide-react";

function Setting() {
  const [shopName, setShopName] = useState("");
  const [shopGST, setShopGST] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [makingCharge, setMakingCharge] = useState("12");
  const [discount, setDiscount] = useState("5");
  const [gstPercent, setGstPercent] = useState("3");

  const handleSave = () => {
    const data = {
      shopName,
      shopGST,
      address,
      phone,
      email,
      makingCharge,
      discount,
      gstPercent,
    };

    console.log(data);

    alert("Settings Saved Successfully ✅");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6f1] to-[#ece7dc] p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#050A30] flex items-center gap-3">
          <SettingsIcon className="w-9 h-9 text-[#050A30]" />
          Shop Settings
        </h1>

        <p className="text-gray-600 mt-2">
          Manage your shop details and billing preferences
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shop Information */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-6">
           
            <h2 className="font-slab text-2xl font-bold text-[#050A30]">
              Shop Information
            </h2>
          </div>

          <div className="space-y-5">
            {/* Shop Name */}
            <div>
              <label className="font-slab font-slab text-sm font-semibold text-gray-700 mb-2 block">
                Shop Name
              </label>

              <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 ring-[#050A30]">
                <Store className="w-5 h-5 text-gray-400 mr-3" />

                <input
                  type="text"
                  placeholder="Enter your shop name"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full outline-none bg-transparent"
                />
              </div>
            </div>

            {/* GST */}
            <div>
              <label className=" font-slab text-sm font-semibold text-gray-700 mb-2 block">
                GSTIN Number
              </label>

              <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 ring-[#050A30]">
                <Receipt className="w-5 h-5 text-gray-400 mr-3" />

                <input
                  type="text"
                  placeholder="Enter GST Number"
                  value={shopGST}
                  onChange={(e) => setShopGST(e.target.value)}
                  className="w-full outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className=" font-slab text-sm font-semibold text-gray-700 mb-2 block">
                Address
              </label>

              <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 ring-[#050A30]">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mb-12" />

                <textarea
                  rows="3"
                  placeholder="Enter shop address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full outline-none bg-transparent resize-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className=" font-slab text-sm font-semibold text-gray-700 mb-2 block">
                Phone Number
              </label>

              <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 ring-[#050A30]">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />

                <input
                  type="text"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className=" font-slab text-sm font-semibold text-gray-700 mb-2 block">
                Email Address
              </label>

              <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 ring-[#050A30]">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />

                <input
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full outline-none bg-transparent"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Billing Preferences */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-6">
            
            <h2 className=" font-slab text-2xl font-bold text-[#050A30]">
              Billing Preferences
            </h2>
          </div>

          <div className="space-y-5">
            {/* Making Charge */}
            <div className="bg-[#f8f6f1] p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className=" font-slab font-semibold text-[#050A30]">
                    Default Making Charge
                  </p>
                  <p className=" font-slab text-sm text-gray-500">
                    Applied on every invoice
                  </p>
                </div>

                <div className="flex items-center bg-white border rounded-xl px-4 py-2 w-28">
                  <Percent className="w-4 h-4 text-gray-400 mr-2" />

                  <input
                    type="number"
                    value={makingCharge}
                    onChange={(e) => setMakingCharge(e.target.value)}
                    className="w-full outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Discount */}
            <div className="bg-[#f8f6f1] p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-slab font-semibold text-[#050A30]">
                    Default Discount
                  </p>
                  <p className="font-slab text-sm text-gray-500">
                    Customer discount percentage
                  </p>
                </div>

                <div className="flex items-center bg-white border rounded-xl px-4 py-2 w-28">
                  <Percent className="w-4 h-4 text-gray-400 mr-2" />

                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full outline-none"
                  />
                </div>
              </div>
            </div>

            {/* GST */}
            <div className="bg-[#f8f6f1] p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className=" font-slab font-semibold text-[#050A30]">
                    Default GST %
                  </p>
                  <p className="font-slab text-sm text-gray-500">
                    GST applied on billing
                  </p>
                </div>

                <div className="flex items-center bg-white border rounded-xl px-4 py-2 w-28">
                  <Percent className="w-4 h-4 text-gray-400 mr-2" />

                  <input
                    type="number"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    className="w-full outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleSave}
              className=" font-slab w-full mt-6 bg-[#050A30] hover:bg-[#09124f] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Setting;