import { useState } from 'react';
import ToggleButton from '../../../components/ui/button/ToggleButton';
import type { GetIntegration } from '@nangohq/types';
import type { NangoSyncConfigWithEndpoint } from '../providerConfigKey/Endpoints/components/List';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '../../../components/ui/Dialog';
import Button from '../../../components/ui/button/Button';
import { useStore } from '../../../store';
import { apiFlowDisable, apiFlowEnable, apiPreBuiltDeployFlow } from '../../../hooks/useFlow';
import { useToast } from '../../../hooks/useToast';
import { mutate } from 'swr';

export const ScriptToggle: React.FC<{
    flow: NangoSyncConfigWithEndpoint;
    integration: GetIntegration['Success']['data'];
}> = ({ flow, integration }) => {
    const { toast } = useToast();
    const env = useStore((state) => state.env);

    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const toggleSync = () => {
        if (flow.type === 'sync') {
            setOpen(!open);
        }
    };

    const onEnable = async () => {
        setLoading(true);

        if (flow.id) {
            // Already deployed, we just need to enable
            const res = await apiFlowEnable(
                env,
                { id: flow.id },
                {
                    provider: integration.integration.provider,
                    providerConfigKey: integration.integration.unique_key,
                    type: flow.type!,
                    scriptName: flow.name
                }
            );
            if ('error' in res.json) {
                toast({ title: 'An unexpected error occurred', variant: 'error' });
            } else {
                toast({ title: `Enabled successfully`, variant: 'success' });
                await mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/integrations'));
                setOpen(false);
            }
        } else {
            // Initial deployment
            const res = await apiPreBuiltDeployFlow(env, {
                provider: integration.integration.provider,
                providerConfigKey: integration.integration.unique_key,
                type: flow.type!,
                scriptName: flow.name
            });
            if ('error' in res.json) {
                toast({ title: 'An unexpected error occurred', variant: 'error' });
            } else {
                toast({ title: `Deployed successfully`, variant: 'success' });
                await mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/integrations'));
                setOpen(false);
            }
        }

        setLoading(false);
    };

    const onDisable = async () => {
        if (!flow.id) {
            return;
        }

        const res = await apiFlowDisable(
            env,
            { id: flow.id },
            {
                provider: integration.integration.provider,
                providerConfigKey: integration.integration.unique_key,
                type: flow.type!,
                scriptName: flow.name
            }
        );
        if ('error' in res.json) {
            toast({ title: 'An unexpected error occurred', variant: 'error' });
        } else {
            toast({ title: `Disabled successfully`, variant: 'success' });
            await mutate((key) => typeof key === 'string' && key.startsWith('/api/v1/integrations'));
            setOpen(false);
        }
    };

    return (
        <div
            className="flex"
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <ToggleButton enabled={flow.enabled === true} onChange={() => toggleSync()} />
                </DialogTrigger>
                <DialogContent>
                    {!flow.enabled && (
                        <>
                            <DialogTitle>Enable sync?</DialogTitle>
                            <DialogDescription>It will start syncing potentially for multiple connections. This will impact your billing.</DialogDescription>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant={'zinc'}>Cancel</Button>
                                </DialogClose>
                                <Button variant={'primary'} isLoading={loading} className="disabled:bg-pure-black" onClick={() => onEnable()}>
                                    Enable
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {flow.enabled && (
                        <>
                            <DialogTitle>Disable sync?</DialogTitle>
                            <DialogDescription>
                                Disabling this sync will result in the deletion of all related synced records potentially for multiple connections. The
                                endpoints to fetch these records will no longer work.
                            </DialogDescription>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant={'zinc'}>Cancel</Button>
                                </DialogClose>
                                <Button variant={'danger'} isLoading={loading} className="disabled:bg-pure-black" onClick={() => onDisable()}>
                                    Disable
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
