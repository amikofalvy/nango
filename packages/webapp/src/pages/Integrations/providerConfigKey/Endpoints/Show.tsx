import { useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useGetIntegrationFlows } from '../../../../hooks/useIntegration';
import { useStore } from '../../../../store';
import { useMemo } from 'react';
import type { GetIntegration, HTTP_VERB } from '@nangohq/types';
import type { NangoSyncConfigWithEndpoint } from './components/List';
import { EndpointsList } from './components/List';
import { EndpointOne } from './components/One';

const allowedGroup = ['customers', 'invoices', 'payments', 'tickets'];
export const EndpointsShow: React.FC<{ integration: GetIntegration['Success']['data'] }> = ({ integration }) => {
    const env = useStore((state) => state.env);
    const { providerConfigKey } = useParams();
    const { data, loading } = useGetIntegrationFlows(env, providerConfigKey!);
    const [searchParams] = useSearchParams();

    const byGroup = useMemo(() => {
        if (!data) {
            return [];
        }

        // Create groups
        const tmp: Record<string, NangoSyncConfigWithEndpoint[]> = {};
        for (const flow of data.flows) {
            for (const endpoint of flow.endpoints) {
                const entries = Object.entries(endpoint)[0];
                const paths = entries[1].split('/');

                const path = paths[1];
                if (!path) {
                    continue;
                }
                const groupName = allowedGroup.includes(path) ? path : 'others';

                let group = tmp[groupName];
                if (!group) {
                    group = [];
                    tmp[groupName] = group;
                }

                group.push({ ...flow, endpoint: { verb: entries[0] as HTTP_VERB, path: entries[1] } });
            }
        }

        // Sort flows inside the groups
        const groups: { name: string; flows: NangoSyncConfigWithEndpoint[] }[] = [];
        for (const group of Object.entries(tmp)) {
            groups.push({
                name: group[0],
                flows: group[1].sort((a, b) => {
                    // Sort by length of path
                    const lenA = (a.endpoint.path.match(/\//g) || []).length;
                    const lenB = (b.endpoint.path.match(/\//g) || []).length;
                    if (lenA > lenB) return 1;
                    else if (lenA < lenB) return -1;

                    // Sort by verb
                    if (a.endpoint.verb === 'GET' && b.endpoint.verb !== 'GET') return -1;
                    else if (a.endpoint.verb === 'POST' && b.endpoint.verb === 'PUT') return -1;
                    else if (a.endpoint.verb === 'PUT' && b.endpoint.verb === 'PATCH') return -1;
                    else if (a.endpoint.verb === 'PATCH' && b.endpoint.verb === 'DELETE') return -1;

                    // Finally sort alphabetically
                    return a.endpoint.path > b.endpoint.path ? 1 : -1;
                })
            });
        }

        return groups;
    }, [data]);

    const currentFlow = useMemo<NangoSyncConfigWithEndpoint | undefined>(() => {
        if (searchParams.size <= 0 || !data) {
            return;
        }

        const verb = searchParams.get('verb');
        const path = searchParams.get('path');
        if (!verb || !path) {
            return;
        }

        for (const flow of data.flows) {
            for (const endpointObj of flow.endpoints) {
                const endpoint = Object.entries(endpointObj)[0];
                if (endpoint[0] === verb && endpoint[1] === path) {
                    return { ...flow, endpoint: { verb: verb as HTTP_VERB, path } };
                }
            }
        }
    }, [searchParams, data]);

    if (loading) {
        return (
            <div>
                <Skeleton className="w-[150px]" />
            </div>
        );
    }

    if (!data) {
        return null;
    }

    if (currentFlow) {
        return <EndpointOne flow={currentFlow} integration={integration} />;
    }

    return <EndpointsList byGroup={byGroup} integration={integration} />;
};
