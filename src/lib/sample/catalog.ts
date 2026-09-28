/**
 * Fictional catalogue used to generate realistic-looking sample data.
 * Every name is randomly combined — none of this is real student data.
 */

export const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Aditya', 'Ananya', 'Arjun', 'Avni', 'Deepak', 'Diya', 'Farhan', 'Gurpreet',
  'Harini', 'Ishaan', 'Jasleen', 'Kabir', 'Kavya', 'Krishna', 'Lakshmi', 'Manish', 'Meera', 'Mohit',
  'Nandini', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rajesh', 'Riya', 'Rohan',
  'Sahil', 'Sana', 'Sandeep', 'Shreya', 'Siddharth', 'Simran', 'Sneha', 'Suresh', 'Tanvi', 'Tanya',
  'Uday', 'Varun', 'Vikram', 'Vivek', 'Yash', 'Zoya', 'Abhishek', 'Bhavna', 'Chetan', 'Divya',
  'Gaurav', 'Hemant', 'Imran', 'Juhi', 'Karan', 'Lavanya', 'Mansi', 'Naveen', 'Omkar', 'Parul',
  'Ritika', 'Sachin', 'Tejas', 'Umesh', 'Vaishnavi', 'Aisha', 'Arnav', 'Keerthi', 'Mehak', 'Tushar',
] as const

export const SURNAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Khaira', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Menon',
  'Das', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Joshi', 'Kulkarni', 'Deshmukh', 'Pillai', 'Rao', 'Naidu',
  'Agarwal', 'Bansal', 'Chauhan', 'Yadav', 'Mishra', 'Pandey', 'Tiwari', 'Saxena', 'Kapoor', 'Malhotra',
  'Mehta', 'Shah', 'Desai', 'Thakur', 'Rathore', 'Gill', 'Sandhu', 'Grewal', 'Dhillon', 'Bhatt',
  'Khan', 'Ansari', 'Qureshi', 'Fernandes', 'DSouza', 'Pereira', 'Bose', 'Ghosh', 'Sen', 'Kaur',
] as const

export const SPECIAL_NEEDS = ['Wheelchair user', 'Needs a scribe', 'Low vision', 'Extra time', 'Crutches'] as const

export interface CourseGroup {
  course: string
  semester: number
  paper: string
  paperName: string
  /** Relative size of this group. */
  weight: number
}

/**
 * Each course + semester writes one paper in the session. First-year papers
 * are shared across branches (as in many universities), which creates a few
 * big papers — the hardest case for seating.
 */
export const COURSE_GROUPS: CourseGroup[] = [
  { course: 'CSE', semester: 1, paper: 'MA101', paperName: 'Engineering Mathematics I', weight: 1.4 },
  { course: 'IT', semester: 1, paper: 'MA101', paperName: 'Engineering Mathematics I', weight: 0.8 },
  { course: 'ECE', semester: 1, paper: 'PH101', paperName: 'Engineering Physics', weight: 1.1 },
  { course: 'EEE', semester: 1, paper: 'PH101', paperName: 'Engineering Physics', weight: 0.7 },
  { course: 'ME', semester: 1, paper: 'CH101', paperName: 'Engineering Chemistry', weight: 0.9 },
  { course: 'CE', semester: 1, paper: 'CH101', paperName: 'Engineering Chemistry', weight: 0.6 },
  { course: 'CSE', semester: 3, paper: 'CS301', paperName: 'Data Structures', weight: 1.4 },
  { course: 'CSE', semester: 5, paper: 'CS501', paperName: 'Operating Systems', weight: 1.3 },
  { course: 'CSE', semester: 7, paper: 'CS701', paperName: 'Machine Learning', weight: 1.2 },
  { course: 'IT', semester: 3, paper: 'CN301', paperName: 'Computer Networks', weight: 0.8 },
  { course: 'IT', semester: 5, paper: 'CC501', paperName: 'Cloud Computing', weight: 0.7 },
  { course: 'ECE', semester: 3, paper: 'EC301', paperName: 'Signals and Systems', weight: 1.0 },
  { course: 'ECE', semester: 5, paper: 'EC501', paperName: 'Digital Communication', weight: 1.0 },
  { course: 'ECE', semester: 7, paper: 'EC701', paperName: 'VLSI Design', weight: 0.8 },
  { course: 'EEE', semester: 3, paper: 'EE301', paperName: 'Electrical Machines', weight: 0.6 },
  { course: 'EEE', semester: 5, paper: 'EE501', paperName: 'Power Systems', weight: 0.6 },
  { course: 'ME', semester: 3, paper: 'TD301', paperName: 'Thermodynamics', weight: 0.8 },
  { course: 'ME', semester: 5, paper: 'MD501', paperName: 'Machine Design', weight: 0.7 },
  { course: 'CE', semester: 3, paper: 'CV301', paperName: 'Structural Analysis', weight: 0.6 },
  { course: 'CE', semester: 5, paper: 'CV501', paperName: 'Geotechnical Engineering', weight: 0.5 },
  { course: 'BBA', semester: 1, paper: 'BB101', paperName: 'Principles of Management', weight: 1.1 },
  { course: 'BBA', semester: 3, paper: 'BB301', paperName: 'Marketing Management', weight: 1.0 },
  { course: 'BBA', semester: 5, paper: 'BB501', paperName: 'Financial Management', weight: 0.9 },
  { course: 'BCOM', semester: 1, paper: 'BC101', paperName: 'Financial Accounting', weight: 1.2 },
  { course: 'BCOM', semester: 3, paper: 'BC301', paperName: 'Corporate Law', weight: 1.0 },
  { course: 'BCOM', semester: 5, paper: 'BC501', paperName: 'Income Tax', weight: 0.9 },
  { course: 'BCA', semester: 1, paper: 'CA101', paperName: 'Programming in C', weight: 0.9 },
  { course: 'BCA', semester: 3, paper: 'CA301', paperName: 'Database Management Systems', weight: 0.8 },
  { course: 'BCA', semester: 5, paper: 'CA501', paperName: 'Web Technologies', weight: 0.7 },
  { course: 'MBA', semester: 1, paper: 'MB101', paperName: 'Managerial Economics', weight: 0.9 },
  { course: 'MBA', semester: 3, paper: 'MB301', paperName: 'Strategic Management', weight: 0.8 },
  { course: 'BSC', semester: 3, paper: 'BS301', paperName: 'Organic Chemistry', weight: 0.6 },
  { course: 'BSC', semester: 5, paper: 'BS501', paperName: 'Quantum Mechanics', weight: 0.5 },
  { course: 'BA', semester: 3, paper: 'HU301', paperName: 'Indian Economy', weight: 0.6 },
]

/** Room shapes found in a typical Indian college block. */
export interface RoomShape {
  kind: string
  rows: number
  cols: number
  seatsPerBench?: number
  weight: number
}

export const ROOM_SHAPES: RoomShape[] = [
  { kind: 'Classroom', rows: 6, cols: 8, weight: 4 },
  { kind: 'Classroom', rows: 7, cols: 8, weight: 3 },
  { kind: 'Bench room', rows: 6, cols: 6, seatsPerBench: 2, weight: 3 },
  { kind: 'Bench room', rows: 8, cols: 6, seatsPerBench: 3, weight: 2 },
  { kind: 'Seminar hall', rows: 8, cols: 10, weight: 2 },
  { kind: 'Lecture theatre', rows: 10, cols: 12, weight: 1 },
  { kind: 'Tutorial room', rows: 5, cols: 6, weight: 1 },
]
