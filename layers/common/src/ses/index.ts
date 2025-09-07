import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

export const ses = {
    sendEmail: async (email: string[], subject: string, body: string) => {
        const sesClient = new SESClient({
            region: 'us-east-1'
        });
        const command = new SendEmailCommand({
            Source: 'yositaka.koizumi@escco.co.jp',
            Destination: {
                ToAddresses: email
            },
            Message: {
                Subject: {
                    Data: subject
                },
                Body: {
                    Html: {
                        Data: body
                    }
                }
            }
        });
        const response = await sesClient.send(command);
        return response;
    }
}   