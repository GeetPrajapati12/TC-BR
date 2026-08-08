import mongoose from "mongoose"

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a project name"],
      maxlength: [100, "Project name cannot be more than 100 characters"],
    },
    key: {
      type: String,
      required: [true, "Please provide a project key"],
      uppercase: true,
      maxlength: [10, "Project key cannot be more than 10 characters"],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    type: {
      type: String,
      enum: ["Web Application", "Mobile App", "API", "Desktop App", "Game", "Other"],
      default: "Web Application",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["Admin", "Lead", "Developer", "Tester", "Viewer"],
          default: "Tester",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed", "Archived"],
      default: "Active",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowBugReporting: {
        type: Boolean,
        default: true,
      },
      allowTestCaseCreation: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
)

// Ensure unique project key within company
ProjectSchema.index({ key: 1, company: 1 }, { unique: true })

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema)
