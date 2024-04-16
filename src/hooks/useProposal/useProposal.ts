import { useCallback, useState } from "react";
import { getNamespace } from "@/utils/helper.util";
import { EIP155_SIGNING_METHODS } from "@/data/methods/EIP155Data.methods";
import useAnalytics from "@/hooks/useAnalytics";
import {
  EIP155_CHAINS,
  MULTIVERS_X_CHAINS,
  SupportedNamespace,
} from "@/data/network.config";
import {
  BuildApprovedNamespacesParams,
  buildApprovedNamespaces,
} from "@walletconnect/utils";
import { formatAccountsByChain } from "@/hooks/useProposal/util";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { web3walletAtom } from "@/store/web3wallet.store";
import { useAtomValue } from "jotai";
import useAccounts, { queryKey as accountsQueryKey } from "@/hooks/useAccounts";
import { walletAPIClientAtom } from "@/store/wallet-api.store";
import {
  queryKey as sessionsQueryKey,
  useQueryFn as useSessionsQueryFn,
} from "../useSessions";
import { queryKey as pendingProposalsQueryKey } from "../usePendingProposals";
import { ProposalTypes } from "@walletconnect/types";

export function useProposal(proposal: ProposalTypes.Struct) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const client = useAtomValue(walletAPIClientAtom);
  const accounts = useAccounts(client);
  const web3wallet = useAtomValue(web3walletAtom);
  const analytics = useAnalytics();

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const handleClick = useCallback(
    (account: string) => {
      if (selectedAccounts.includes(account)) {
        setSelectedAccounts(selectedAccounts.filter((s) => s !== account));
      } else {
        setSelectedAccounts([...selectedAccounts, account]);
      }
    },
    [selectedAccounts],
  );

  const navigateToHome = useCallback(() => {
    return navigate({
      to: "/",
      search: (search) => search,
    });
  }, [navigate]);

  const buildEip155Namespace = useCallback(
    (requiredNamespaces: ProposalTypes.RequiredNamespaces) => {
      const accountsByChain = formatAccountsByChain(
        proposal,
        accounts.data,
      ).filter(
        (a) =>
          a.accounts.length > 0 &&
          a.isSupported &&
          Object.keys(EIP155_CHAINS).includes(a.chain),
      );
      const dataToSend = accountsByChain.reduce<
        { account: string; chain: string }[]
      >(
        (accum, elem) =>
          accum.concat(
            elem.accounts
              .filter((acc) => selectedAccounts.includes(acc.id))
              .map((a) => ({
                account: `${getNamespace(a.currency)}:${a.address}`,
                chain: getNamespace(a.currency),
              })),
          ),
        [],
      );
      const namespace =
        requiredNamespaces && Object.keys(requiredNamespaces).length > 0
          ? requiredNamespaces[SupportedNamespace.EIP155]
          : { methods: [] as string[], events: [] as string[] };

      const methods: string[] = [
        ...new Set([
          ...namespace.methods,
          ...Object.values(EIP155_SIGNING_METHODS),
        ]),
      ];
      const events = [
        ...new Set([
          ...namespace.events,
          "session_proposal",
          "session_request",
          "auth_request",
          "session_delete",
        ]),
      ];

      return {
        chains: [...new Set(dataToSend.map((e) => e.chain))],
        methods,
        events,
        accounts: dataToSend.map((e) => e.account),
      };
    }
    , [accounts.data, proposal, selectedAccounts])

  const buildMvxNamespace = useCallback(
    (requiredNamespaces: ProposalTypes.RequiredNamespaces) => {
      const accountsByChain = formatAccountsByChain(
        proposal,
        accounts.data,
      ).filter(
        (a) =>
          a.accounts.length > 0 &&
          a.isSupported &&
          Object.keys(MULTIVERS_X_CHAINS).includes(a.chain),
      );
      const dataToSend = accountsByChain.reduce<
        { account: string; chain: string }[]
      >(
        (accum, elem) =>
          accum.concat(
            elem.accounts
              .filter((acc) => selectedAccounts.includes(acc.id))
              .map((a) => ({
                account: `${getNamespace(a.currency)}:${a.address}`,
                chain: getNamespace(a.currency),
              })),
          ),
        [],
      );
      const namespace = requiredNamespaces[SupportedNamespace.MVX];

      const methods: string[] = namespace.methods;

      const events = [
        ...new Set([
          ...namespace.events,
          "session_proposal",
          "session_request",
          "auth_request",
          "session_delete",
        ]),
      ];

      return {
        chains: [...new Set(dataToSend.map((e) => e.chain))],
        methods,
        events,
        accounts: dataToSend.map((e) => e.account),
      };
    }
    , [accounts.data, proposal, selectedAccounts])

  const buildSupportedNamespaces = useCallback(
    (proposal: ProposalTypes.Struct) => {
      const requiredNamespaces = proposal.requiredNamespaces;
      const supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"] =
        {};

      if ("eip155" in requiredNamespaces) {
        supportedNamespaces[SupportedNamespace.EIP155] =
          buildEip155Namespace(requiredNamespaces);
      }
      if ("mvx" in requiredNamespaces) {
        supportedNamespaces[SupportedNamespace.MVX] =
          buildMvxNamespace(requiredNamespaces);
      }
      return supportedNamespaces;
    },
    [buildEip155Namespace, buildMvxNamespace],
  );

  const sessionsQueryFn = useSessionsQueryFn(web3wallet);

  const approveSession = useCallback(async () => {
    try {
      const supportedNs = buildSupportedNamespaces(proposal);
      const session = await web3wallet.approveSession({
        id: proposal.id,
        namespaces: buildApprovedNamespaces({
          proposal,
          supportedNamespaces: supportedNs,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: pendingProposalsQueryKey,
      });
      // Prefetching as we need the data in the next route to avoid redirecting to home
      await queryClient.prefetchQuery({
        queryKey: sessionsQueryKey,
        queryFn: sessionsQueryFn,
      });
      await navigate({
        to: "/detail/$topic",
        params: { topic: session.topic },
        search: (search) => search,
      });
    } catch (error) {
      // TODO : display error toast
      console.error(error);
      await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: pendingProposalsQueryKey,
      });
      await navigate({
        to: "/",
        search: (search) => search,
      });
    }
  }, [
    buildSupportedNamespaces,
    navigate,
    proposal,
    queryClient,
    sessionsQueryFn,
    web3wallet,
  ]);

  const rejectSession = useCallback(async () => {
    await web3wallet.rejectSession({
      id: proposal.id,
      reason: {
        code: 5000,
        message: "USER_REJECTED_METHODS",
      },
    });
    await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    await queryClient.invalidateQueries({
      queryKey: pendingProposalsQueryKey,
    });
    await navigate({
      to: "/",
      search: (search) => search,
    });
  }, [navigate, proposal, queryClient, web3wallet]);

  const handleClose = useCallback(() => {
    void rejectSession();
    analytics.track("button_clicked", {
      button: "Close",
      page: "Wallet Connect Error Unsupported Blockchains",
    });
  }, [analytics, rejectSession]);

  const addNewAccount = useCallback(
    async (currency: string) => {
      try {
        await client.account.request({
          currencyIds: [currency],
        });
        // TODO Maybe we should also select the requested account
      } catch (error) {
        console.error("request account canceled by user");
      }
      // refetch accounts
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
    [client, queryClient],
  );

  // No need for a memo as it's directly spread on usage
  return {
    approveSession,
    rejectSession,
    handleClose,
    handleClick,
    accounts: accounts.data,
    selectedAccounts,
    addNewAccount,
    navigateToHome,
  };
}
