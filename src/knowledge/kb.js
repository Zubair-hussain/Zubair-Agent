// ─────────────────────────────────────────────────────────────────────────────
//  ZUBAIR AI AGENT v2 — Master Knowledge Base
//  This is the brain. Update this file to keep the agent current.
// ─────────────────────────────────────────────────────────────────────────────

export const KB = {

  // ── IDENTITY ──────────────────────────────────────────────────────────────
  identity: {
    name: "Syed Zubair Hussain Shah",
    alias: "Zubair",
    agentName: "Zubair AI",
    title: "Full Stack Developer · Mobile Developer · AI/ML Engineer · Video Editor & Graphic Designer",
    tagline: "I don't just write code — I build products that work.",
    location: "Hyderabad, Sindh, Pakistan",
    timezone: "PKT — UTC+5 (Pakistan Standard Time)",
    available: "Mon–Sat, 9 AM – 9 PM PKT",
    phone: "+92 311-0302103",
    whatsapp: "https://wa.me/923110302103",
    bookingLink: "https://calendly.com/xovatotech", // placeholder — update with real link
  },

  // ── PLATFORMS & SOCIAL ────────────────────────────────────────────────────
  platforms: {
    upwork: {
      label: "Upwork",
      url: "https://www.upwork.com/freelancers/~zubairhussain",
      note: "Available for fixed-price and hourly contracts. Rising Talent badge.",
    },
    fiverr: {
      label: "Fiverr",
      url: "https://www.fiverr.com/zubairhussain",
      note: "Video editing gigs + web development packages available.",
    },
    github: {
      label: "GitHub",
      url: "https://github.com/Zubair-hussain",
      note: "35+ repositories — full stack, ML, AI projects.",
    },
    linkedin: {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/syed-zubair-hussain-shah-491294376",
      note: "Connect for professional inquiries and collaborations.",
    },
    notion: {
      label: "Notion Portfolio",
      url: "https://www.notion.so/Zubair-Hussain-Full-Stack-Developer-3278c7707d0180b784a2d7807e6157c4",
      note: "Full portfolio, service details, project roadmaps, and pitch deck.",
    },
    instagram: {
      label: "Instagram",
      url: "https://www.instagram.com/detro_onshah",
      note: "Creative work, designs, and behind-the-scenes content.",
    },
    facebook: {
      label: "Facebook",
      url: "https://www.facebook.com/zubairhussainshah",
      note: "Follow for updates and project showcases.",
    },
    whatsapp: {
      label: "WhatsApp",
      url: "https://wa.me/923110302103",
      note: "Direct message for quick project discussions.",
    },
    portfolio: {
      label: "Portfolio Website",
      url: "https://zubair-hussain-shah.vercel.app",
      note: "Live portfolio with projects, skills, and contact.",
    },
  },

  // ── SKILLS ────────────────────────────────────────────────────────────────
  skills: {
    fullstack: [
      "React", "Next.js 15", "TypeScript", "JavaScript (ES6+)",
      "Node.js", "Express.js", "MongoDB", "MySQL",
      "REST APIs", "JWT Auth", "Firebase", "AWS", "Vercel",
    ],
    mobile: [
      "React Native", "Cross-platform iOS & Android",
      "Mobile UI/UX", "App Store deployment",
    ],
    aiml: [
      "Python", "Scikit-learn", "Pandas", "NumPy",
      "Jupyter Notebook", "Data Preprocessing",
      "Linear Regression", "Classification Models",
      "Text-to-Image Generation", "AI API Integration",
      "Kaggle (Top 10%)",
    ],
    frontend: [
      "HTML5", "CSS3", "Tailwind CSS", "Bootstrap",
      "Framer Motion", "Three.js", "Figma", "Responsive Design",
    ],
    cms: ["WordPress", "Shopify", "WooCommerce", "Custom Themes", "Liquid"],
    videoEditing: [
      "Adobe Premiere Pro", "After Effects", "DaVinci Resolve", "CapCut",
      "TikTok/Reels/Shorts editing", "YouTube long-form",
      "Motion graphics", "Color grading",
    ],
    graphicDesign: [
      "Adobe Photoshop", "Figma", "UI/UX Design",
      "Wireframing", "Prototyping", "Brand Identity",
      "Social media graphics", "Thumbnails",
    ],
    devtools: ["Git", "GitHub", "Postman", "VS Code", "FastAPI", "PHP"],
  },

  // ── SERVICES & PRICING ────────────────────────────────────────────────────
  services: [
    {
      id: "landing",
      name: "Landing Page",
      tech: "Next.js / WordPress",
      price: "$200–$500",
      timeline: "3–5 days",
      includes: ["Responsive design", "SEO optimized", "Contact form", "1 round of revisions"],
    },
    {
      id: "webapp",
      name: "Full Stack Web App",
      tech: "MERN / Next.js + TypeScript",
      price: "$800–$2500",
      timeline: "2–4 weeks",
      includes: ["Auth system", "Database", "Admin dashboard", "AWS/Vercel deployment", "3 revisions"],
    },
    {
      id: "mobile",
      name: "Mobile App",
      tech: "React Native",
      price: "$1000–$3000",
      timeline: "3–6 weeks",
      includes: ["iOS + Android", "API integration", "Push notifications", "App store ready"],
    },
    {
      id: "shopify",
      name: "Shopify Store",
      tech: "Shopify + Liquid",
      price: "$300–$800",
      timeline: "5–7 days",
      includes: ["Custom theme", "Product setup", "Payment integration", "Mobile optimized"],
    },
    {
      id: "wordpress",
      name: "WordPress Website",
      tech: "WordPress + PHP + ACF",
      price: "$250–$700",
      timeline: "4–6 days",
      includes: ["Custom theme", "CMS setup", "SEO plugin", "Speed optimization"],
    },
    {
      id: "ai",
      name: "AI Integration / Chatbot",
      tech: "Python / Node.js + AI APIs",
      price: "$500–$1500",
      timeline: "1–3 weeks",
      includes: ["Custom trained agent", "API endpoints", "Frontend integration", "Documentation"],
    },
    {
      id: "video",
      name: "Video Editing",
      tech: "Premiere Pro / DaVinci / CapCut",
      price: "$30–$100 per video",
      timeline: "1–2 days",
      includes: ["Color grading", "Motion graphics", "Captions", "Platform-optimized export"],
    },
    {
      id: "design",
      name: "UI/UX & Graphic Design",
      tech: "Figma / Photoshop",
      price: "$150–$400",
      timeline: "2–4 days",
      includes: ["Wireframes", "Prototypes", "Brand assets", "Export-ready files"],
    },
    {
      id: "mlmodel",
      name: "ML / Data Analysis",
      tech: "Python + Scikit-learn + Pandas",
      price: "$400–$1200",
      timeline: "1–3 weeks",
      includes: ["Data preprocessing", "Model training", "Evaluation report", "Jupyter notebook"],
    },
  ],

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  projects: [
    {
      name: "Full Stack E-commerce Platform",
      tech: "MERN + JWT",
      desc: "Complete e-commerce with auth, product catalog, cart, and admin dashboard.",
      link: "https://github.com/Zubair-hussain",
    },
    {
      name: "Text-to-Image Generator",
      tech: "Python + Deep Learning",
      desc: "Generates AI images from text prompts using deep learning models.",
      link: "https://github.com/Zubair-hussain/Text-To-Image-",
    },
    {
      name: "IMDb Top 1000 Analysis",
      tech: "Pandas + NumPy + Jupyter",
      desc: "Full EDA and visualization on IMDb dataset for AI internship.",
      link: "https://github.com/Zubair-hussain/imdb-top1000-analysis",
    },
    {
      name: "Salary Prediction ML Model",
      tech: "Scikit-learn + Linear Regression",
      desc: "Predicts salaries from experience. Full pipeline with deployment-ready code.",
      link: "https://github.com/Zubair-hussain/Salary-Prediction-using-Traditional-ML-Techniques.",
    },
    {
      name: "Custom Shopify Store",
      tech: "Shopify + Liquid + JS",
      desc: "Branded theme that boosted client sales by 15%.",
    },
    {
      name: "Next.js Client Project",
      tech: "Next.js + TypeScript + AWS + Tailwind",
      desc: "SEO-optimized responsive site with CI/CD on AWS.",
    },
    {
      name: "Movie App",
      tech: "JavaScript",
      desc: "Browse, search, and filter movies with clean UI.",
      link: "https://github.com/Zubair-hussain/Movie-App",
    },
    {
      name: "MVC Task Manager",
      tech: "JavaScript (MVC)",
      desc: "Task app demonstrating clean MVC architecture.",
      link: "https://github.com/Zubair-hussain/MVC-Task-",
    },
  ],

  // ── CERTIFICATIONS ────────────────────────────────────────────────────────
  certifications: [
    "AI Engineer Professional Certificate — Coursera",
    "Full Stack Web Development — Coursera",
    "Responsive Web Design — freeCodeCamp",
    "Data Analysis with Python — freeCodeCamp",
    "React Native & Mobile App Development — Udemy",
    "JavaScript & React — freeCodeCamp / Scrimba",
    "Data Analytics Foundations — Google/IBM (In Progress)",
    "AWS Cloud Practitioner (Planned)",
  ],

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  education: {
    degree: "B.Sc. Information Technology",
    institution: "Government College University, Hyderabad, Pakistan",
    graduation: "July 2025",
  },

  // ── EXPERIENCE STATS ──────────────────────────────────────────────────────
  stats: {
    projectsDelivered: "15+",
    videosProduced: "30+",
    dataNotebooks: "50+",
    githubRepos: "35+",
    kaggle: "Top 10% in multiple competitions",
    yearsActive: "2022 – Present",
  },

  // ── NOTION ROADMAP ────────────────────────────────────────────────────────
  notion: {
    url: "https://www.notion.so/Zubair-Hussain-Full-Stack-Developer-3278c7707d0180b784a2d7807e6157c4",
    description: "Zubair's full Notion workspace includes project roadmaps, service details, proposal templates, and the Xovato pitch deck. Clients can view the full breakdown of deliverables and timelines there.",
  },

  // ── CONTRACT TERMS ────────────────────────────────────────────────────────
  contractTerms: [
    "50% upfront deposit required before work begins. Remaining 50% on delivery.",
    "Up to 3 revision rounds included. Additional revisions billed separately.",
    "Timeline starts after deposit received and all project assets provided by client.",
    "Full source code and ownership transferred to client upon final payment.",
    "Client must respond within 48 hours to feedback requests to avoid delays.",
    "All client data and project details kept strictly confidential.",
    "Disputes resolved through mutual discussion in good faith before escalation.",
    "Zubair operates in PKT (UTC+5). Responses within 24 hours on business days.",
    "Rush delivery (under 48 hours) available at 1.5x standard rate.",
  ],

  // ── TIMEZONE CONVERSIONS ──────────────────────────────────────────────────
  timezones: {
    PKT: { offset: 5, label: "Pakistan (PKT)" },
    EST: { offset: -5, label: "US Eastern (EST)" },
    CST: { offset: -6, label: "US Central (CST)" },
    PST: { offset: -8, label: "US Pacific (PST)" },
    AEST: { offset: 10, label: "Australia Eastern (AEST)" },
    GMT: { offset: 0, label: "UK (GMT)" },
    UAE: { offset: 4, label: "UAE (GST)" },
  },

  // ── FAQ ───────────────────────────────────────────────────────────────────
  faq: [
    {
      q: ["do you work on weekends", "weekend availability", "saturday sunday"],
      a: "Yes! Zubair is available Monday–Saturday, 9 AM–9 PM PKT. Sunday is off but urgent messages are checked.",
    },
    {
      q: ["how do i pay", "payment method", "how to pay"],
      a: "Payments via Upwork (safest), PayPal, Wise, or direct bank transfer. 50% upfront, 50% on delivery.",
    },
    {
      q: ["nda", "confidential", "privacy", "sign nda"],
      a: "Absolutely. Zubair signs NDAs for all client projects. Confidentiality is a standard part of every contract.",
    },
    {
      q: ["revision", "changes", "edit"],
      a: "Every project includes up to 3 free revision rounds. Additional revisions are billed at an hourly rate.",
    },
    {
      q: ["rush", "urgent", "asap", "fast delivery"],
      a: "Rush delivery is available at 1.5x the standard rate. For truly urgent work, message directly on WhatsApp.",
    },
    {
      q: ["maintenance", "support after", "after delivery"],
      a: "30 days of free bug fixes after delivery. Ongoing maintenance packages available on request.",
    },
    {
      q: ["stack", "tech stack", "technologies", "what do you use"],
      a: "Primary stack: Next.js + TypeScript + Node.js + MongoDB for web. React Native for mobile. Python for AI/ML. Figma for design.",
    },
  ],
};

export default KB;
