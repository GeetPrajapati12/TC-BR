import mongoose from "mongoose"

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a company name"],
      unique: true,
      trim: true,
      maxlength: [100, "Company name cannot be more than 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    industry: {
      type: String,
      enum: ["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Retail", "Other"],
      default: "Technology",
    },
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowEmployeeRegistration: {
        type: Boolean,
        default: true,
      },
      maxProjects: {
        type: Number,
        default: 50,
      },
      maxUsers: {
        type: Number,
        default: 100,
      },
    },
  },
  {
    timestamps: true,
  },
)

CompanySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  }
  next()
})

export default mongoose.models.Company || mongoose.model("Company", CompanySchema)
