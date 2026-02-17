import mongoose, { Schema, Document, Model } from "mongoose"

export interface ITimeSegment {
  startTime: string
  endTime: string
}

export interface ITask extends Document {
  date: Date
  // Keep old fields for backward compatibility
  startTime?: string
  endTime?: string
  // New structure: array of time segments
  timeSegments: ITimeSegment[]
  description: string
  type: "Work" | "Holiday" | "Weekend"
  duration: string
  month: number
  year: number
}

const TimeSegmentSchema: Schema = new Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
})

const TaskSchema: Schema = new Schema(
  {
    date: { type: Date, required: true },
    // Backward compatibility fields
    startTime: { type: String, required: false },
    endTime: { type: String, required: false },
    // New structure
    timeSegments: {
      type: [TimeSegmentSchema],
      required: false,
      default: [],
    },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["Work", "Holiday", "Weekend" , "Leave"],
      required: true,
    },
    duration: { type: String, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
)

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema)

export default Task
