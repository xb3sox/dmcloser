export const previewConversations = [
  {
    id: "sofia",
    name: "Sofia Mitchell",
    initials: "SM",
    color: "peach",
    channel: "instagram" as const,
    intent: "Buy",
    status: "Ready to buy",
    time: "2m",
    lastMessage: "Do you ship to New York?",
    messages: [
      {
        sender: "contact",
        text: "Hi! I just found your linen collection. So beautiful.",
      },
      {
        sender: "agent",
        text: "Thank you, Sofia! The linen sets are a studio favorite. Is there a color you have your eye on?",
      },
      {
        sender: "contact",
        text: "The olive one! Do you ship to New York? I'd love to order a set.",
      },
    ],
    reply:
      "Great choice! The olive set is in stock, and we ship to New York in 3-5 business days. Want me to send you the checkout link?",
    confidence: 97,
  },
  {
    id: "alex",
    name: "Alex Rivera",
    initials: "AR",
    color: "lavender",
    channel: "whatsapp" as const,
    intent: "Buy",
    status: "Qualified lead",
    time: "8m",
    lastMessage: "Can I get two in size medium?",
    messages: [
      {
        sender: "contact",
        text: "Hello! Are the everyday linen shirts still available?",
      },
      {
        sender: "agent",
        text: "Hi Alex! Yes, we have a fresh restock in all three colors. What size are you looking for?",
      },
      {
        sender: "contact",
        text: "Perfect. Can I get two in size medium, one white and one olive?",
      },
    ],
    reply:
      "Absolutely! Both colors are available in medium. I'll put together a checkout link for one white and one olive linen shirt. Shall I send it over?",
    confidence: 96,
  },
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    color: "sage",
    channel: "instagram" as const,
    intent: "Question",
    status: "Getting to know you",
    time: "14m",
    lastMessage: "Is the linen machine washable?",
    messages: [
      {
        sender: "contact",
        text: "Your linen sets look lovely! Can I ask a quick question?",
      },
      { sender: "agent", text: "Of course, Maya. Happy to help!" },
      {
        sender: "contact",
        text: "Is the linen machine washable? I need something easy to care for.",
      },
    ],
    reply:
      "Yes! A gentle, cold machine wash is all it needs. Air dry for the best finish, and it gets softer with every wash. Would you like help choosing a set?",
    confidence: 94,
  },
];
