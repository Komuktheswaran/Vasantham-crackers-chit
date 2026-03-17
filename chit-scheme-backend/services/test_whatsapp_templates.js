const { sendWhatsappMessage } = require('./whatsappService');

async function testTemplates() {
    const testNumber = "9003568114";
    console.log(`🚀 Starting WhatsApp Template Test for number: ${testNumber}`);

    // Test 1: payment1
    console.log("\n--- Testing 'payment1' Template ---");
    const paymentResult = await sendWhatsappMessage(
        testNumber,
        "payment1",
        ["John Doe", "1000", "Gold Scheme M-1000"],
        "John Doe"
    );
    console.log("Payment Receipt Result:", paymentResult ? "✅ SUCCESS" : "❌ FAILED");

    // Test 2: remainder1
    console.log("\n--- Testing 'remainder1' Template ---");
    const reminderResult = await sendWhatsappMessage(
        testNumber,
        "reminder1",
        ["John Doe", "1000", "March", "10th of March 2026"],
        "John Doe"
    );
    console.log("Reminder Result:", reminderResult ? "✅ SUCCESS" : "❌ FAILED");

    console.log("\n🏁 Test completed. Please check your phone for the messages.");
}

testTemplates();
