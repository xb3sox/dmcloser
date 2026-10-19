import type { Conversation, BusinessSettings, Intent, Message } from "@/types";
import { previewConversations } from "./preview";

const now = Date.now();
const minutesAgo = (minutes: number) => now - minutes * 60000;

export const defaultSettings: BusinessSettings = {
  businessName: "Maison Studio",
  businessDescription:
    "Thoughtfully made linen clothing and home essentials. Sample catalog: olive and white linen sets and everyday linen shirts. In this demo, delivery to New York takes 3-5 business days; linen can be machine washed on a cold, gentle cycle and air dried.",
  productsSold: "Linen clothing, everyday shirts, and home essentials",
  tone: "friendly",
  autoReplyEnabled: false,
  autoSendConfidenceThreshold: 85,
};

function message(
  conversationId: string,
  text: string,
  minutes: number,
  sender: Message["sender"] = "contact",
): Message {
  return {
    id: `${conversationId}-${minutes}-${sender}`,
    conversationId,
    sender,
    text,
    timestamp: minutesAgo(minutes),
  };
}

export const mockConversations: Conversation[] = [
  ...previewConversations.map((preview, index): Conversation => {
    const id = `conv-${index + 1}`;
    const age = [2, 8, 14][index];
    return {
      id,
      contactName: preview.name,
      contactAvatar: preview.initials,
      platform: preview.channel,
      lastMessage: preview.messages.slice(-1)[0].text,
      lastMessageTime: minutesAgo(age),
      intent: preview.intent === "Buy" ? "buy" : "question",
      conversionStatus: index < 2 ? "qualified" : "engaged",
      unread: index < 2,
      autoSendEnabled: false,
      leadNotes: [
        "Interested in the olive linen set. Ships to New York. Ready for a checkout link.",
        "Looking for two medium linen shirts, one white and one olive.",
        "Interested in easy-care linen. Asked about machine washing.",
      ][index],
      messages: preview.messages.map((item, messageIndex) =>
        message(
          id,
          item.text,
          age + (preview.messages.length - messageIndex - 1) * 4,
          item.sender === "contact" ? "contact" : "ai",
        ),
      ),
    };
  }),
  {
    id: "conv-4",
    contactName: "Emily Watson",
    contactAvatar: "EW",
    platform: "instagram",
    lastMessage: "Order placed. Thank you for your help!",
    lastMessageTime: minutesAgo(21),
    intent: "buy",
    conversionStatus: "converted",
    unread: false,
    autoSendEnabled: false,
    leadNotes: "Ordered a white linen set. Prefers a relaxed fit.",
    messages: [
      message("conv-4", "I would love the white linen set in medium.", 30),
      message(
        "conv-4",
        "Of course, Emily. I have sent over the checkout details.",
        28,
        "user",
      ),
      message("conv-4", "Order placed. Thank you for your help!", 21),
    ],
  },
  {
    id: "conv-5",
    contactName: "Daniel Brooks",
    contactAvatar: "DB",
    platform: "whatsapp",
    lastMessage: "Can I return an item from my last order?",
    lastMessageTime: minutesAgo(35),
    intent: "question",
    conversionStatus: "engaged",
    unread: true,
    autoSendEnabled: false,
    leadNotes: "Existing customer. Return policy needs a human review.",
    messages: [
      message("conv-5", "Can I return an item from my last order?", 35),
    ],
  },
  {
    id: "conv-6",
    contactName: "Olivia Park",
    contactAvatar: "OP",
    platform: "instagram",
    lastMessage: "How much is the olive set?",
    lastMessageTime: minutesAgo(47),
    intent: "buy",
    conversionStatus: "new",
    unread: false,
    autoSendEnabled: false,
    leadNotes:
      "First conversation. Asked for a price; confirm it before sharing.",
    messages: [message("conv-6", "Hi! How much is the olive set?", 47)],
  },
  {
    id: "conv-7",
    contactName: "James Liu",
    contactAvatar: "JL",
    platform: "whatsapp",
    lastMessage: "Do you offer wholesale orders for boutiques?",
    lastMessageTime: minutesAgo(63),
    intent: "buy",
    conversionStatus: "new",
    unread: false,
    autoSendEnabled: false,
    leadNotes:
      "Runs an independent boutique. Interested in wholesale. Needs a custom quote.",
    messages: [
      message(
        "conv-7",
        "Your linen collection looks perfect for our shop. Do you offer wholesale orders for boutiques?",
        63,
      ),
    ],
  },
  {
    id: "conv-8",
    contactName: "Follower Promotions",
    contactAvatar: "FP",
    platform: "instagram",
    lastMessage: "Buy 1000 followers today! Limited offer!",
    lastMessageTime: minutesAgo(90),
    intent: "spam",
    conversionStatus: "lost",
    unread: false,
    autoSendEnabled: false,
    leadNotes: "Unsolicited promotion. Do not reply automatically.",
    messages: [
      message("conv-8", "Buy 1000 followers today! Limited offer!", 90),
    ],
  },
];

function applyTone(text: string, settings: BusinessSettings): string {
  if (settings.tone === "premium")
    return text
      .replace("Great choice!", "An excellent choice.")
      .replace("Absolutely!", "Certainly.")
      .replace("Yes!", "Of course.")
      .replace("I would be happy", "I would be delighted")
      .replace("Want me to", "May I")
      .replace("Shall I send it over?", "May I share the details with you?");
  if (settings.tone === "aggressive")
    return text
      .replace(
        "Want me to send you the checkout link?",
        "Let's get your order started. Shall I send the checkout link?",
      )
      .replace(
        "Would you like help choosing a set?",
        "Shall we find your perfect set?",
      )
      .replace("Shall I send it over?", "Shall I get your order started?")
      .replace(
        "What would you like to know first?",
        "Which option would you like to explore first?",
      );
  return text;
}

export function mockGenerateAiReply(
  conversation: Conversation,
  settings: BusinessSettings,
): { text: string; confidence: number; intent: Intent } {
  const lastMessage =
    conversation.messages.slice(-1)[0]?.text.toLowerCase() ?? "";
  let text: string;
  let confidence = 65;
  if (/refund|return|complaint/.test(lastMessage)) {
    text =
      "I can help you with that. Could you share your order number and what you would like to return? I will check the order and confirm the next steps before making any changes.";
    confidence = 62;
  } else if (/price|cost|how much/.test(lastMessage)) {
    text = `Thank you for your interest in ${settings.businessName}. Let me confirm the current pricing for you. Which item and size are you considering?`;
    confidence = 68;
  } else if (/wholesale|custom quote/.test(lastMessage)) {
    text =
      "Thank you for thinking of us for your shop. Could you share the products and quantities you have in mind? I can then put together the details for a personal quote.";
    confidence = 71;
  } else {
    const preview = previewConversations.find(
      (item) => item.name === conversation.contactName,
    );
    const usesSampleContext =
      settings.businessName === defaultSettings.businessName &&
      settings.productsSold === defaultSettings.productsSold &&
      settings.businessDescription === defaultSettings.businessDescription;
    if (usesSampleContext && preview) {
      text = preview.reply;
      confidence = preview.confidence;
    } else {
      text = `Thank you for reaching out to ${settings.businessName}. We offer ${settings.productsSold.replace(/\.$/, "")}. I would be happy to help you find the right option. What would you like to know first?`;
    }
  }
  return {
    text: applyTone(text, settings),
    confidence,
    intent: conversation.intent,
  };
}
