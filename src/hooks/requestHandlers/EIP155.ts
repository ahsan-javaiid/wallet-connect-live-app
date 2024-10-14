import type { Web3Wallet } from "@walletconnect/web3wallet/dist/types/client";
import type { Account, WalletAPIClient } from "@ledgerhq/wallet-api-client";
import {
  EIP155_SIGNING_METHODS,
  type EIP155_REQUESTS,
} from "@/data/methods/EIP155Data.methods";
import { getAccountWithAddressAndChainId } from "@/utils/generic";
import { stripHexPrefix } from "@/utils/currencyFormatter/helpers";
import { convertEthToLiveTX } from "@/utils/converters";
import { acceptRequest, Errors, formatMessage, rejectRequest } from "./utils";

export async function handleEIP155Request(
  request: EIP155_REQUESTS,
  topic: string,
  id: number,
  chainId: string,
  accounts: Account[],
  client: WalletAPIClient,
  web3wallet: Web3Wallet,
) {
  switch (request.method) {
    case EIP155_SIGNING_METHODS.ETH_SIGN:
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN: {
      const isPersonalSign =
        request.method === EIP155_SIGNING_METHODS.PERSONAL_SIGN;
      const accountSign = getAccountWithAddressAndChainId(
        accounts,
        isPersonalSign ? request.params[1] : request.params[0],
        chainId,
      );
      if (accountSign) {
        try {
          const message = stripHexPrefix(
            isPersonalSign ? request.params[0] : request.params[1],
          );

          const signedMessage = await client.message.sign(
            accountSign.id,
            Buffer.from(message, "hex"),
          );
          await acceptRequest(
            web3wallet,
            topic,
            id,
            formatMessage(signedMessage),
          );
        } catch (error) {
          await rejectRequest(web3wallet, topic, id, Errors.userDecline);
          console.error(error);
        }
      } else {
        await rejectRequest(web3wallet, topic, id, Errors.userDecline);
      }
      break;
    }
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4: {
      const accountSignTyped = getAccountWithAddressAndChainId(
        accounts,
        request.params[0],
        chainId,
      );
      if (accountSignTyped) {
        try {
          const message = stripHexPrefix(request.params[1]);

          const signedMessage = await client.message.sign(
            accountSignTyped.id,
            Buffer.from(message),
          );
          await acceptRequest(
            web3wallet,
            topic,
            id,
            formatMessage(signedMessage),
          );
        } catch (error) {
          await rejectRequest(web3wallet, topic, id, Errors.msgDecline);
          console.error(error);
        }
      } else {
        await rejectRequest(web3wallet, topic, id, Errors.msgDecline);
      }
      break;
    }
    case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
    case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION: {
      const ethTx = request.params[0];
      const accountTX = getAccountWithAddressAndChainId(
        accounts,
        ethTx.from,
        chainId,
      );
      if (accountTX) {
        try {
          const liveTx = convertEthToLiveTX(ethTx);
          const hash = await client.transaction.signAndBroadcast(
            accountTX.id,
            liveTx,
          );
          await acceptRequest(web3wallet, topic, id, hash);
        } catch (error) {
          await rejectRequest(web3wallet, topic, id, Errors.txDeclined);
          console.error(error);
        }
      } else {
        await rejectRequest(web3wallet, topic, id, Errors.txDeclined);
      }
      break;
    }
    default:
      await rejectRequest(
        web3wallet,
        topic,
        id,
        Errors.unsupportedMethods,
        5101,
      );
  }
}