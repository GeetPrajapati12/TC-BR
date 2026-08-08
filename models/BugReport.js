import mongoose from "mongoose"

const BugReportSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    steps: {
      type: String,
      required: true,
    },
    expected: {
      type: String,
      required: true,
    },
    actual: {
      type: String,
      required: true,
    },
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
    environment: {
      type: String,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure unique bug report ID within project
BugReportSchema.index({ id: 1, project: 1 }, { unique: true })

export default mongoose.models.BugReport || mongoose.model("BugReport", BugReportSchema)
