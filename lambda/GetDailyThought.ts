import {
    ConnectContactFlowEvent,
    ConnectContactFlowHandler,
    ConnectContactFlowResult,
} from 'aws-lambda';

const THOUGHTS_BY_WEEKDAY: Record<string, string> = {
    Monday: "Chant and be happy. A quiet mind is the beginning of spiritual sadhana.",
    Tuesday: "Service to others, done without expectation, is itself a form of worship.",
    Wednesday: "The soul is eternal; the body is temporary. Peace comes from remembering the difference.",
    Thursday: "Gratitude transforms an ordinary day into a day of grace.",
    Friday: "Family bonds, nurtured with patience, are a reflection of the divine bond.",
    Saturday: "Rest the body, but keep the mind engaged in remembrance and reflection.",
    Sunday: "A week well lived is one where every action was offered, not just performed.",
};

export const handler: ConnectContactFlowHandler = async (_event: ConnectContactFlowEvent): Promise<ConnectContactFlowResult> => {

    const day: string = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });

    const thought: string = THOUGHTS_BY_WEEKDAY[day]
        ?? "Every moment is an opportunity to turn inward.";

    return {
        "THOUGHT": thought,
    };

}
