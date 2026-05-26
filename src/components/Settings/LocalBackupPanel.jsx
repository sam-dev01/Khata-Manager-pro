
import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, message, Modal, Space, Tag } from 'antd';
import { CloudDownloadOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { LocalBackupService } from '../../services/LocalBackupService';
import { importData } from '../../utils/storage';

const { Text } = Typography;
const { confirm } = Modal;

const LocalBackupPanel = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const list = await LocalBackupService.listBackups();
            // Sort by date desc (assuming filenames have date or we just parse them)
            // Filename format from backup service usually: backup_YYYY-MM-DDTHH-mm-ss.json
            // We can just sort reverse if they are named by date.
            setBackups(list.reverse());
        } catch (error) {
            console.error("Failed to list backups", error);
            message.error("Failed to load local backups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (LocalBackupService.isAvailable()) {
            fetchBackups();
        }
    }, []);

    const handleRestore = async (backupFile) => {
        confirm({
            title: 'Restore Local Backup?',
            icon: <ExclamationCircleOutlined />,
            content: `This will overwrite current data with data from ${backupFile}. Are you sure?`,
            okText: 'Yes, Restore',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                const hide = message.loading('Restoring backup...', 0);
                try {
                    const data = await LocalBackupService.loadBackup(backupFile);
                    if (data) {
                        await importData(data);
                        message.success('Backup Restored Successfully! Refreshing...');
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        message.error('Empty backup file');
                    }
                } catch (error) {
                    console.error("Restore failed", error);
                    message.error("Failed to restore backup");
                } finally {
                    hide();
                }
            }
        });
    };

    return (
        <Card
            title={<span><CloudDownloadOutlined /> Local Backups (Device Storage)</span>}
            extra={<Button icon={<ReloadOutlined />} onClick={fetchBackups} loading={loading}>Refresh</Button>}
            style={{ marginTop: 20 }}
            type="inner"
        >
            <List
                pagination={{ pageSize: 5 }}
                dataSource={backups}
                loading={loading}
                locale={{ emptyText: 'No local backups found' }}
                renderItem={item => (
                    <List.Item
                        actions={[
                            <Button size="small" type="primary" danger onClick={() => handleRestore(item)}>Restore</Button>
                        ]}
                    >
                        <List.Item.Meta
                            avatar={<Tag color="blue">JSON</Tag>}
                            title={item}
                            description="Stored locally in Documents/KhataBackups"
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default LocalBackupPanel;
