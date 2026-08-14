import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "user" | "admin";
  status: "active" | "frozen" | "banned";
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalProfit: number;
  totalLoss: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  withdrawalBanned: boolean;
  withdrawalBanReason?: string;
  tradeBanned: boolean;
  tradeBanReason?: string;
  frozenReason?: string;
  profileHealth: number;
  withdrawalAccount?: {
    currency: "INR" | "PKR" | "USDT";
    accountHolder?: string;
    accountName?: string;
    ifscNumber?: string;
    accountTitle?: string;
    accountNumber?: string;
    accountHolderName?: string;
    walletAddress?: string;
  };
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["active", "frozen", "banned"], default: "active" },
    balance: { type: Number, default: 0 },
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    withdrawalBanned: { type: Boolean, default: false },
    withdrawalBanReason: { type: String },
    tradeBanned: { type: Boolean, default: false },
    tradeBanReason: { type: String },
    frozenReason: { type: String },
    profileHealth: { type: Number, default: 100, min: 0, max: 100 },
    withdrawalAccount: {
      type: new Schema({
        currency: { type: String, enum: ["INR", "PKR", "USDT"], required: true },
        accountHolder: { type: String },
        accountName: { type: String },
        ifscNumber: { type: String },
        accountTitle: { type: String },
        accountNumber: { type: String },
        accountHolderName: { type: String },
        walletAddress: { type: String },
      }, { _id: false }),
      default: undefined,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
