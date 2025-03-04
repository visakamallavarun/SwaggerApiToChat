import React, { useState, useRef } from 'react';
import './index.css';
import { CloudUploadOutlined, LinkOutlined } from '@ant-design/icons';
import { Attachments, AttachmentsProps, Sender } from '@ant-design/x';
import { Button, Flex, type GetProp, type GetRef, message } from 'antd';

const App: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, 'items'>>([]);
  const [text, setText] = useState<string>('');
  const [recording, setRecording] = useState<boolean>(false);

  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

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
            message.info(`Mock Customize Recording: ${nextRecording}`);
            setRecording(nextRecording);
          },
        }}
      />
    </Flex>
  );
};



export default App;
