import mongoose from "mongoose"

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
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
        "created_project",
        "updated_project",
        "deleted_project",
        "joined_project",
        "left_project",
        "status_changed",
        "assigned_task",
        "user_login",
        "user_logout",
        "user_registered",
        "company_created",
      ],
    },
    entityType: {
      type: String,
      enum: ["TestCase", "BugReport", "User", "Project", "Company"],
    },
    entityId: { type: String },
    description: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

ActivityLogSchema.index({ company: 1, createdAt: -1 })
ActivityLogSchema.index({ company: 1, project: 1, createdAt: -1 })

export default mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema)
