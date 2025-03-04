import React, { useState, useRef } from "react";
import "./index.css";
import {
  CloudUploadOutlined,
  FireOutlined,
  LinkOutlined,
  ReadOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Attachments, AttachmentsProps, Bubble, Prompts, Sender, Welcome } from "@ant-design/x";
import { Button, Space, type GetProp, type GetRef } from "antd";
import { getTokenOrRefresh } from "./token_util";
import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { createStyles } from "antd-style";

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 1000px;
      height: 722px;
      border-radius: ${token.borderRadius}px;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;

      .ant-prompts {
        color: ${token.colorText};
      }
    `,
    menu: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
    `,
    conversations: css`
      padding: 0 12px;
      flex: 1;
      overflow-y: auto;
    `,
    chat: css`
      height: 100%;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;
    `,
    messages: css`
      flex: 1;
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
    logo: css`
      display: flex;
      height: 72px;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;

      img {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      span {
        display: inline-block;
        margin: 0 8px;
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      width: calc(100% - 24px);
      margin: 0 12px 24px 12px;
    `,
  };
});

const senderPromptsItems: GetProp<typeof Prompts, "items"> = [
  {
    key: "1",
    description: "Hot Topics",
    icon: <FireOutlined style={{ color: "#FF4D4F" }} />,
  },
  {
    key: "2",
    description: "Design Guide",
    icon: <ReadOutlined style={{ color: "#1890FF" }} />,
  },
];

const App: React.FC = () => {
  const { styles } = useStyle();
  const [open, setOpen] = useState<boolean>(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, "items">>([]);
  const [text, setText] = useState<string>("");
  const [recording, setRecording] = useState<boolean>(false);

  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const onPromptsItemClick: GetProp<typeof Prompts, "onItemClick"> = (info) => {
    setText(info.data.description as string);
  };

  const openSwaggerBackendApiPage = () => {
    window.open("https://localhost:7049/swagger/index.html", "_blank"); // Open in a new tab
  };
  
  const placeholderNode = (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="Hello, I'm Swagger To Chat"
        description="Base on Ant Design, AGI product interface solution, create a better intelligent vision"
        extra={
          <Space>
            <Button icon={<ShareAltOutlined />}onClick={openSwaggerBackendApiPage} />
          </Space>
        }
      />
    </Space>
  );

  const sttFromMic = async () => {
    try {
      const tokenObj = await getTokenOrRefresh();
      const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
        tokenObj?.authToken,
        tokenObj?.region
      );
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new speechsdk.SpeechRecognizer(
        speechConfig,
        audioConfig
      );

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
    } finally {
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
          type === "drop"
            ? {
                title:
                  items.length >= 1
                    ? "You can only upload one file"
                    : "Drop file here",
              }
            : {
                icon: <CloudUploadOutlined />,
                title:
                  items.length >= 1 ? "File already uploaded" : "Upload file",
                description:
                  items.length >= 1 ? "" : "Click or drag a file to upload",
              }
        }
        disabled={items.length >= 1}
      />
    </Sender.Header>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.chat}>
      <Bubble.List
          items={
            // items.length > 0
            //   ? items
            //   : 
            [{ content: placeholderNode, variant: 'borderless' }]
          }
          className={styles.messages}
        />
        <Prompts items={senderPromptsItems} onItemClick={onPromptsItemClick} />
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
            setText("");
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
          className={styles.sender}
        />
      </div>
    </div>
  );
};

export default App;
