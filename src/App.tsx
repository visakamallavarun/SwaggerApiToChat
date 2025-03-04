import React, { useState, useRef } from 'react';
import './index.css';
import { CloudUploadOutlined, LinkOutlined } from '@ant-design/icons';
import { Attachments, AttachmentsProps, Sender } from '@ant-design/x';
import { Button, Flex, type GetProp, type GetRef, } from 'antd';
import { getTokenOrRefresh } from './token_util';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

const App: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, 'items'>>([]);
  const [text, setText] = useState<string>('');
  const [recording, setRecording] = useState<boolean>(false);

  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const sttFromMic = async () => {
    try {
      const tokenObj = await getTokenOrRefresh();
      const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj?.authToken, tokenObj?.region);
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

      setText("Listening...");
      
      recognizer.recognizeOnceAsync(async (result) => {
        if (result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          setText(result.text);
        } else {
          setText("Speech not recognized. Please try again.");
        }
      });
    } catch (error) {
      console.error("Speech recognition error:", error);
      setText("Error starting speech recognition.");
    }finally{
      setRecording(false);
    }
  };

  const senderHeader = (
    <Sender.Header
      title="Attachments"
      styles={{
        content: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      forceRender
    >
      <Attachments
        ref={attachmentsRef}
        beforeUpload={() => {
          if (items.length >= 1) {
            return false; // Prevent additional uploads
          }
          return false; // Prevent default upload behavior
        }}
        items={items}
        onChange={({ fileList }) => {
          setItems(fileList.slice(0, 1)); // Restrict to only one file
        }}
        placeholder={(type) =>
          type === 'drop'
            ? {
                title:
                  items.length >= 1
                    ? 'You can only upload one file'
                    : 'Drop file here',
              }
            : {
                icon: <CloudUploadOutlined />,
                title:
                  items.length >= 1 ? 'File already uploaded' : 'Upload file',
                description:
                  items.length >= 1 ? '' : 'Click or drag a file to upload',
              }
        }
        disabled={items.length >= 1}
      />
    </Sender.Header>
  );

  return (
    <Flex style={{ height: 220 }} align="end">
      <Sender
        ref={senderRef}
        header={senderHeader}
        prefix={
          <Button
            type="text"
            icon={<LinkOutlined />}
            onClick={() => setOpen(!open)}
          />
        }
        value={text}
        onChange={setText}
          onPasteFile={(file: File) => {
            attachmentsRef.current?.upload(file);
            setOpen(true);
          }}
        onSubmit={() => {
          setItems([]);
          setText('');
        }}
        allowSpeech={{
          recording,
          onRecordingChange: (nextRecording: boolean) => {
            console.log("Recording:", nextRecording);
            if (nextRecording) {
              sttFromMic();
            }
            setRecording(nextRecording);
          },
        }}
      />
    </Flex>
  );
};



export default App;
