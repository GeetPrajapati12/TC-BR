import mongoose from "mongoose"

const BugReportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    summary: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    steps: { type: String, required: true },
    expected: { type: String, required: true },
    actual: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    severity: {
      type: String,
      enum: ["Minor", "Major", "Critical", "Blocker"],
      default: "Major",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed", "Reopened"],
      default: "Open",
    },
    environment: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, trim: true },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
)

BugReportSchema.index({ id: 1, project: 1 }, { unique: true })
BugReportSchema.index({ company: 1, project: 1, status: 1 })

export default mongoose.models.BugReport || mongoose.model("BugReport", BugReportSchema)
