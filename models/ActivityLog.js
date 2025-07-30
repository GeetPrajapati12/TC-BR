import mongoose from "mongoose"

const ActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "created_test_case",
        "updated_test_case",
        "deleted_test_case",
        "created_bug_report",
        "updated_bug_report",
        "deleted_bug_report",
        "status_changed",
        "assigned_task",
        "user_login",
        "user_logout",
        "user_registered",
      ],
    },
    entityType: {
      type: String,
      enum: ["TestCase", "BugReport", "User"],
    },
    entityId: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema)
