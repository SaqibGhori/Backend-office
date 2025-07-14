const AlarmRecord = require("../models/AlarmRecord"); // if you're using mongoose model
const mongoose = require("mongoose");

exports.getAlarmCountsPerGateway = async (req, res) => {
  try {
    const result = await mongoose.connection.db
      .collection("alarmrecords") // ← make sure this matches actual collection name
      .aggregate([
        {
          $group: {
            _id: "$gatewayId",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            gatewayId: "$_id",
            count: 1,
            _id: 0
          }
        }
      ])
      .toArray();

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error in getAlarmCountsPerGateway:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
