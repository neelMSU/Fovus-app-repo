const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { EC2Client, RunInstancesCommand } = require("@aws-sdk/client-ec2");

reg='us-east-2';
const s3 = new S3Client({ region: reg });
const ec2 = new EC2Client({ region: reg });
const dynamoDB = DynamoDBDocument.from(new DynamoDB({}));
const buck='fovus-bucket2';
const tbN='fovus-table';
const cntT='text/plain';
const ami='ami-0900fe555666598a2';
const typ='t2.micro';

async function generateNanoid() {
    if (typeof nanoid === 'undefined') {
        const { nanoid: localNanoid } = await import('nanoid');
        nanoid = localNanoid;
    }
    return nanoid;
}

exports.handler = async (event) => {
    const generateId = await generateNanoid();

    let inpData;
    try {
        inpData = JSON.parse(event.body);
    } catch (e) {
        console.log(e);
        return {
            statusCode: 400,
        };
    }
    const { inpTxt, fileName } = inpData;
    const bucketName = buck;
    const fileKey = `${fileName}.txt`;

    const dbParams = {
        TableName: tbN,
        Item: {
            id: generateId(),inputText: inpTxt,inputFile: `s3://${bucketName}/${fileKey}`,
        },
    };

    try {
        const ourURL = await getSignedUrl(s3, new PutObjectCommand({
            Bucket: bucketName,Key: fileKey,ContentType: cntT,
        }), { expiresIn: 3600 });

        await dynamoDB.put(dbParams);

        const userDataScript = `#!/bin/bash
echo 'Hello World!' > /home/ec2-user/hello.txt
shutdown -h +10 # Auto shutdown after 10 minutes
        `;
        const cmd = new RunInstancesCommand({
            ImageId: ami,InstanceType: typ,MinCount: 1,MaxCount: 1,UserData: Buffer.from(userDataScript).toString('base64'),
        });

        const { Instances } = await ec2.send(cmd);
        const instanceId = Instances[0].InstanceId;

        return {
            statusCode: 200,
            body: JSON.stringify({ id: dbParams.Item.id, s3Path: dbParams.Item.inputFile, ourURL, instanceId }),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
        };
    }
};
