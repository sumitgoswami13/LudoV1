// SqsService.js
const AWS = require('aws-sdk');
require('dotenv').config();

class SqsService {
    constructor() {
        AWS.config.update({
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });

        this.sqs = new AWS.SQS();
        this.queueUrl = process.env.SQS_QUEUE_URL;
    }

    async sendMessage(messageBody) {
        const params = {
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(messageBody),
        };

        try {
            const data = await this.sqs.sendMessage(params).promise();
            console.log('Message sent to SQS:', data.MessageId);
            return data.MessageId;
        } catch (error) {
            console.error('Error sending message to SQS:', error);
            throw error;
        }
    }

    async receiveMessages() {
        const params = {
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 10,
        };

        try {
            const data = await this.sqs.receiveMessage(params).promise();
            if (data.Messages) {
                console.log('Messages received from SQS:', data.Messages);
                return data.Messages;
            } else {
                console.log('No messages received');
                return [];
            }
        } catch (error) {
            console.error('Error receiving messages from SQS:', error);
            throw error;
        }
    }

    async deleteMessage(receiptHandle) {
        const params = {
            QueueUrl: this.queueUrl,
            ReceiptHandle: receiptHandle,
        };

        try {
            await this.sqs.deleteMessage(params).promise();
            console.log('Message deleted from SQS');
        } catch (error) {
            console.error('Error deleting message from SQS:', error);
            throw error;
        }
    }
}

module.exports = SqsService;
