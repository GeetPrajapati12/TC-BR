import mongoose from "mongoose"

const TestCaseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    scenario: {
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
      default: "",
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Passed", "Failed", "Blocked"],
      default: "Not Started",
    },
    remarks: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    category: {
      type: String,
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

export default mongoose.models.TestCase || mongoose.model("TestCase", TestCaseSchema)
