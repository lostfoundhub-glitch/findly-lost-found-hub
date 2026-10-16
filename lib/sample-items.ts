export type ItemType = "lost" | "found";

export type SampleItem = {
  id: number;
  name: string;
  category: string;
  type: ItemType;
  location: string;
  date: string;
  image: string;
  cardColor: string;
  colorName: string;
  description: string;
};

export const SAMPLE_ITEMS: SampleItem[] = [
  {
    id: 1,
    name: "กระเป๋าสะพายสีชมพู",
    category: "กระเป๋า",
    type: "lost",
    location: "อาคารเรียนรวม",
    date: "12 ต.ค. 2569",
    image: "/items/pink-bag.avif",
    cardColor: "#FCE4EC",
    colorName: "ชมพู pink",
    description: "กระเป๋าสะพายสีชมพู ใบขนาดกลาง ใช้ใส่ของส่วนตัว",
  },
  {
    id: 2,
    name: "หูฟังไร้สาย",
    category: "อุปกรณ์อิเล็กทรอนิกส์",
    type: "found",
    location: "ห้องสมุด",
    date: "13 ต.ค. 2569",
    image: "/items/melonheadphone.jpg",
    cardColor: "#E3F2FD",
    colorName: "ดำ black",
    description: "พบหูฟังไร้สายสีดำในบริเวณห้องสมุด",
  },
  {
    id: 3,
    name: "พวงกุญแจสีเหลือง",
    category: "กุญแจ",
    type: "lost",
    location: "โรงอาหาร",
    date: "13 ต.ค. 2569",
    image: "/items/yellow-key.avif",
    cardColor: "#FFF3CD",
    colorName: "เหลือง yellow",
    description: "พวงกุญแจสีเหลืองขนาดเล็ก",
  },
  {
    id: 4,
    name: "กระเป๋าเป้สีครีม",
    category: "กระเป๋า",
    type: "found",
    location: "ลานกิจกรรม",
    date: "14 ต.ค. 2569",
    image: "/items/cream-backpack.avif",
    cardColor: "#E8F5E9",
    colorName: "ครีม beige cream",
    description: "พบกระเป๋าเป้สีครีมบริเวณลานกิจกรรม",
  },
  {
    id: 5,
    name: "โทรศัพท์มือถือ",
    category: "อุปกรณ์อิเล็กทรอนิกส์",
    type: "lost",
    location: "อาคารเรียน",
    date: "14 ต.ค. 2569",
    image: "/items/phone.webp",
    cardColor: "#EDE7F6",
    colorName: "ดำ black",
    description: "โทรศัพท์มือถือสีดำ",
  },
  {
    id: 6,
    name: "ตุ๊กตาตัวน้อย",
    category: "อื่น ๆ",
    type: "found",
    location: "สวนกลางมหาวิทยาลัย",
    date: "14 ต.ค. 2569",
    image: "/items/teddy-bear.jpg",
    cardColor: "#FCE4EC",
    colorName: "ชมพู pink",
    description: "พบตุ๊กตาตัวเล็กบริเวณสวนกลางมหาวิทยาลัย",
  },
];