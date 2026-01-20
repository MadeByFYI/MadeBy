import { NextResponse } from "next/server";

// Machine-readable API documentation for AI parsing
export async function GET() {
  const documentation = {
    "$schema": "https://madeby.example/docs/schema/v1",
    "version": "1.0.0",
    "generated": new Date().toISOString(),
    "name": "MadeBy API",
    "description": "Content attribution and identity verification platform API",
    "baseUrl": "https://madeby.example",

    "overview": {
      "purpose": "MadeBy enables creators to declare how their content was made (by humans, AI, or collaboration) and provides verifiable identities and badges for content attribution.",
      "coreFeatures": [
        "Content declaration with attribution type (HUMAN, AI, WITH_AI)",
        "Identity management for individuals, organizations, and AI agents",
        "Multi-factor identity verification (email, phone, domain, address)",
        "Badge generation with QR codes linking to declarations",
        "AI identity verification through provider API integration"
      ]
    },

    "contentTypes": {
      "HUMAN": {
        "code": "HUMAN",
        "label": "Made by Human Intelligence",
        "shortLabel": "HI",
        "description": "Content created entirely by human intelligence without AI assistance",
        "color": "cyan"
      },
      "AI": {
        "code": "AI",
        "label": "Made by Artificial Intelligence",
        "shortLabel": "AI",
        "description": "Content generated entirely by AI systems with minimal human direction",
        "color": "pink"
      },
      "WITH_AI": {
        "code": "WITH_AI",
        "label": "Made with AI Assistance",
        "shortLabel": "+AI",
        "description": "Content created through human-AI collaboration with significant human creative direction",
        "color": "purple"
      }
    },

    "identityTypes": {
      "INDIVIDUAL": {
        "code": "INDIVIDUAL",
        "description": "A human person creating content",
        "verificationMethods": ["email", "phone", "domain", "address"]
      },
      "CORPORATE": {
        "code": "CORPORATE",
        "description": "A company, studio, or collective",
        "verificationMethods": ["email", "phone", "domain", "address"]
      },
      "AI": {
        "code": "AI",
        "description": "An AI system (Claude, GPT-4, Gemini, etc.)",
        "verificationMethods": ["provider_api_key", "operator_verification"],
        "additionalConfig": {
          "provider": "required",
          "model": "required",
          "modelVersion": "optional",
          "operator": "optional (linked identity)"
        }
      }
    },

    "aiProviders": [
      { "code": "ANTHROPIC", "name": "Anthropic", "models": ["CLAUDE_OPUS", "CLAUDE_SONNET", "CLAUDE_HAIKU"], "type": "text" },
      { "code": "OPENAI", "name": "OpenAI", "models": ["GPT_4", "GPT_4_TURBO", "GPT_4O", "O1", "O1_MINI", "DALL_E_2", "DALL_E_3"], "type": "text+image" },
      { "code": "GOOGLE", "name": "Google", "models": ["GEMINI_PRO", "GEMINI_ULTRA", "IMAGEN", "IMAGEN_2"], "type": "text+image" },
      { "code": "META", "name": "Meta", "models": ["LLAMA_3"], "type": "text" },
      { "code": "MISTRAL", "name": "Mistral", "models": ["OTHER"], "type": "text" },
      { "code": "COHERE", "name": "Cohere", "models": ["OTHER"], "type": "text" },
      { "code": "STABILITY", "name": "Stability AI", "models": ["STABLE_DIFFUSION", "STABLE_DIFFUSION_XL", "STABLE_DIFFUSION_3"], "type": "image" },
      { "code": "MIDJOURNEY", "name": "Midjourney", "models": ["MIDJOURNEY_V5", "MIDJOURNEY_V6"], "type": "image" },
      { "code": "ADOBE", "name": "Adobe", "models": ["FIREFLY"], "type": "image" },
      { "code": "OTHER", "name": "Other", "models": ["OTHER"], "type": "any" }
    ],

    "attestationLevels": [
      { "code": "SELF_REPORTED", "strength": 1, "description": "User claims this, no proof provided" },
      { "code": "LOCAL_LOG", "strength": 2, "description": "Extracted from local tool logs (e.g., Claude Code request IDs)" },
      { "code": "PROVIDER_CORROBORATED", "strength": 3, "description": "Cross-referenced with provider usage data" },
      { "code": "PROVIDER_VERIFIED", "strength": 4, "description": "Provider confirmed via verification API (future)" }
    ],

    "attestationSources": [
      { "code": "CLAUDE_CODE_LOG", "description": "Extracted from ~/.claude/ local logs" },
      { "code": "API_RESPONSE", "description": "Direct from API response header (x-request-id)" },
      { "code": "USER_SUBMITTED", "description": "User manually provided request ID" },
      { "code": "PROVIDER_EXPORT", "description": "From provider's usage data export" },
      { "code": "C2PA_METADATA", "description": "Extracted from C2PA manifest embedded in content" },
      { "code": "SYNTHID_DETECTED", "description": "Detected via SynthID watermark analysis" }
    ],

    "provenanceTypes": {
      "C2PA": {
        "code": "C2PA",
        "name": "Coalition for Content Provenance and Authenticity",
        "description": "Industry standard for content provenance using cryptographically signed manifests",
        "supportedBy": ["Adobe", "Microsoft", "Intel", "BBC", "OpenAI (DALL-E)"],
        "verificationMethod": "Parse embedded C2PA manifest and validate certificate chain",
        "detectableFields": ["claim_generator", "signature", "certificate_chain", "issuer", "timestamp"]
      },
      "SYNTHID": {
        "code": "SYNTHID",
        "name": "SynthID by Google DeepMind",
        "description": "Imperceptible watermark embedded at pixel level in AI-generated images",
        "supportedBy": ["Google (Imagen, Gemini)"],
        "verificationMethod": "Analyze image using SynthID detection model",
        "detectableFields": ["confidence_score", "version", "provider"]
      },
      "ADOBE_CR": {
        "code": "ADOBE_CR",
        "name": "Adobe Content Credentials",
        "description": "Adobe's implementation of C2PA for creative tools",
        "supportedBy": ["Adobe Photoshop", "Adobe Lightroom", "Adobe Firefly"],
        "verificationMethod": "Uses C2PA standard with Adobe certificates"
      },
      "IPTC": {
        "code": "IPTC",
        "name": "IPTC Photo Metadata",
        "description": "International Press Telecommunications Council metadata standard",
        "supportedBy": ["Most photo editing software", "News organizations"],
        "detectableFields": ["creator", "copyright", "source", "date_created"]
      }
    },

    "provenanceStatuses": ["DETECTED", "NOT_DETECTED", "TAMPERED", "INVALID", "PENDING"],

    "hashAlgorithms": [
      { "code": "SHA256", "description": "SHA-256 (recommended default)", "outputBits": 256 },
      { "code": "SHA384", "description": "SHA-384", "outputBits": 384 },
      { "code": "SHA512", "description": "SHA-512", "outputBits": 512 },
      { "code": "SHA3_256", "description": "SHA-3 256-bit", "outputBits": 256 },
      { "code": "SHA3_512", "description": "SHA-3 512-bit", "outputBits": 512 },
      { "code": "BLAKE2B", "description": "BLAKE2b (fast, secure)", "outputBits": 512 },
      { "code": "BLAKE3", "description": "BLAKE3 (fastest, modern)", "outputBits": 256 },
      { "code": "MD5", "description": "MD5 (legacy only, not recommended)", "outputBits": 128 }
    ],

    "hashTargets": [
      { "code": "FILE", "description": "Hash computed from uploaded file bytes" },
      { "code": "URL_CONTENT", "description": "Hash computed from content fetched at originalUrl" },
      { "code": "TEXT_CONTENT", "description": "Hash computed from text/description field" },
      { "code": "COMBINED", "description": "Hash computed from multiple elements combined" }
    ],

    "verificationStatuses": ["UNVERIFIED", "PENDING", "VERIFIED", "FAILED"],

    "authentication": {
      "methods": ["session", "api_key"],
      "apiKeyHeader": "Authorization: Bearer mk_xxxxx",
      "apiKeyPrefix": "mk_",
      "apiKeyManagement": "/dashboard/api-keys",
      "notes": [
        "Session authentication uses HTTP-only cookies from login",
        "API keys can be created in the dashboard and used for programmatic access",
        "API key management endpoints (/api/keys/*) require session auth only"
      ]
    },

    "endpoints": {
      "content": {
        "list": {
          "method": "GET",
          "path": "/api/content",
          "authentication": "required",
          "description": "List authenticated user's content declarations",
          "parameters": {
            "limit": { "type": "integer", "in": "query", "default": 50, "max": 100 },
            "offset": { "type": "integer", "in": "query", "default": 0 },
            "contentType": { "type": "enum", "values": ["HUMAN", "AI", "WITH_AI"], "in": "query", "required": false }
          },
          "response": {
            "contents": { "type": "Content[]" },
            "pagination": {
              "total": { "type": "integer" },
              "limit": { "type": "integer" },
              "offset": { "type": "integer" },
              "hasMore": { "type": "boolean" }
            }
          }
        },
        "create": {
          "method": "POST",
          "path": "/api/content",
          "authentication": "required",
          "description": "Create a new content declaration",
          "requestBody": {
            "title": { "type": "string", "required": true },
            "description": { "type": "string", "required": false },
            "contentType": { "type": "enum", "values": ["HUMAN", "AI", "WITH_AI"], "required": true },
            "creatorName": { "type": "string", "required": true },
            "originalUrl": { "type": "string", "required": false },
            "thumbnailUrl": { "type": "string", "required": false },
            "attribution": { "type": "string", "required": false },
            "collaborators": { "type": "array<string>", "required": false },
            "aiToolsUsed": { "type": "array<string>", "required": false },
            "owner": { "type": "string", "required": false, "description": "Name or @handle of content owner" },
            "contentHash": { "type": "string", "required": false, "description": "Cryptographic hash of content (hex-encoded)" },
            "hashAlgorithm": { "type": "enum", "values": ["SHA256", "SHA384", "SHA512", "SHA3_256", "SHA3_512", "BLAKE2B", "BLAKE3", "MD5"], "required": false },
            "hashTarget": { "type": "enum", "values": ["FILE", "URL_CONTENT", "TEXT_CONTENT", "COMBINED"], "required": false },
            "hashInputSize": { "type": "integer", "required": false, "description": "Size in bytes of hashed input" },
            "hashInputFilename": { "type": "string", "required": false, "description": "Original filename if FILE target" },
            "gitCommitHash": { "type": "string", "required": false, "description": "Git commit SHA (full 40-char or short form)" },
            "gitRepositoryUrl": { "type": "string", "required": false, "description": "URL to the repository (GitHub, GitLab, etc.)" }
          },
          "response": { "type": "Content" }
        },
        "get": {
          "method": "GET",
          "path": "/api/content/{id}",
          "authentication": "none",
          "description": "Get content declaration by ID (public)",
          "parameters": {
            "id": { "type": "string", "in": "path", "required": true }
          },
          "response": { "type": "Content" }
        },
        "update": {
          "method": "PATCH",
          "path": "/api/content/{id}",
          "authentication": "required",
          "description": "Update content declaration (owner only)",
          "parameters": {
            "id": { "type": "string", "in": "path", "required": true }
          },
          "requestBody": {
            "title": { "type": "string", "required": false },
            "description": { "type": "string", "required": false },
            "contentType": { "type": "enum", "values": ["HUMAN", "AI", "WITH_AI"], "required": false },
            "creatorName": { "type": "string", "required": false },
            "originalUrl": { "type": "string", "required": false },
            "thumbnailUrl": { "type": "string", "required": false },
            "attribution": { "type": "string", "required": false },
            "collaborators": { "type": "array<string>", "required": false },
            "aiToolsUsed": { "type": "array<string>", "required": false },
            "owner": { "type": "string", "required": false },
            "contentHash": { "type": "string", "required": false },
            "hashAlgorithm": { "type": "enum", "values": ["SHA256", "SHA384", "SHA512", "SHA3_256", "SHA3_512", "BLAKE2B", "BLAKE3", "MD5"], "required": false },
            "hashTarget": { "type": "enum", "values": ["FILE", "URL_CONTENT", "TEXT_CONTENT", "COMBINED"], "required": false },
            "hashInputSize": { "type": "integer", "required": false },
            "hashInputFilename": { "type": "string", "required": false },
            "gitCommitHash": { "type": "string", "required": false },
            "gitRepositoryUrl": { "type": "string", "required": false }
          },
          "response": { "type": "Content" }
        },
        "delete": {
          "method": "DELETE",
          "path": "/api/content/{id}",
          "authentication": "required",
          "description": "Delete content declaration (owner only)",
          "parameters": {
            "id": { "type": "string", "in": "path", "required": true }
          },
          "response": { "success": { "type": "boolean" } }
        },
        "getBadge": {
          "method": "GET",
          "path": "/api/content/{id}/badge",
          "authentication": "none",
          "description": "Get badge image with QR code",
          "parameters": {
            "id": { "type": "string", "in": "path", "required": true }
          },
          "response": { "type": "image/png" }
        },
        "getSimpleBadge": {
          "method": "GET",
          "path": "/api/content/{id}/badge-simple",
          "authentication": "none",
          "description": "Get simple badge without QR code",
          "parameters": {
            "id": { "type": "string", "in": "path", "required": true }
          },
          "response": { "type": "image/png" }
        }
      },
      "identity": {
        "get": {
          "method": "GET",
          "path": "/api/identity",
          "authentication": "required",
          "description": "Get current user's identity",
          "response": { "type": "Identity" }
        },
        "create": {
          "method": "POST",
          "path": "/api/identity",
          "authentication": "required",
          "description": "Create identity for current user",
          "requestBody": {
            "handle": { "type": "string", "required": false, "pattern": "^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$" },
            "identityType": { "type": "enum", "values": ["INDIVIDUAL", "CORPORATE", "AI"], "required": false, "default": "INDIVIDUAL" },
            "displayName": { "type": "string", "required": false },
            "bio": { "type": "string", "required": false },
            "avatarUrl": { "type": "string", "required": false },
            "aiConfig": {
              "type": "object",
              "required": false,
              "description": "Required when identityType is AI",
              "properties": {
                "provider": { "type": "enum", "values": ["ANTHROPIC", "OPENAI", "GOOGLE", "META", "MISTRAL", "COHERE", "OTHER"] },
                "model": { "type": "string" },
                "modelVersion": { "type": "string" }
              }
            }
          }
        },
        "update": {
          "method": "PATCH",
          "path": "/api/identity",
          "authentication": "required",
          "description": "Update current user's identity"
        },
        "getByHandle": {
          "method": "GET",
          "path": "/api/identity/{handle}",
          "authentication": "optional",
          "description": "Get public profile by handle. Authenticated users see their own private data.",
          "parameters": {
            "handle": { "type": "string", "in": "path", "required": true }
          },
          "response": {
            "handle": { "type": "string" },
            "displayName": { "type": "string" },
            "bio": { "type": "string | null" },
            "avatarUrl": { "type": "string | null" },
            "identityType": { "type": "enum", "values": ["INDIVIDUAL", "CORPORATE", "AI"] },
            "aiConfig": { "type": "IdentityAIConfig | null", "description": "Only for AI identities" },
            "isOwner": { "type": "boolean", "description": "True if authenticated user is the profile owner" },
            "emails": { "type": "array", "description": "Public emails only (all if owner)" },
            "phones": { "type": "array", "description": "Public phones only (all if owner)" },
            "domains": { "type": "array", "description": "Public domains only (all if owner)" },
            "mailingAddress": { "type": "object | null", "description": "Only if PUBLIC (always if owner)" },
            "contents": { "type": "Content[]", "description": "User's content declarations" }
          }
        },
        "checkHandle": {
          "method": "POST",
          "path": "/api/identity/handle/check",
          "authentication": "required",
          "description": "Check if handle is available",
          "requestBody": {
            "handle": { "type": "string", "required": true }
          },
          "response": {
            "available": { "type": "boolean" },
            "reason": { "type": "string", "optional": true },
            "message": { "type": "string", "optional": true }
          }
        }
      },
      "identityContacts": {
        "addEmail": {
          "method": "POST",
          "path": "/api/identity/emails",
          "authentication": "required",
          "requestBody": {
            "email": { "type": "string", "required": true },
            "isPrimary": { "type": "boolean", "default": false },
            "visibility": { "type": "enum", "values": ["PUBLIC", "PRIVATE"], "default": "PRIVATE" }
          }
        },
        "addPhone": {
          "method": "POST",
          "path": "/api/identity/phones",
          "authentication": "required",
          "requestBody": {
            "phone": { "type": "string", "required": true },
            "isPrimary": { "type": "boolean", "default": false },
            "visibility": { "type": "enum", "values": ["PUBLIC", "PRIVATE"], "default": "PRIVATE" }
          }
        },
        "addDomain": {
          "method": "POST",
          "path": "/api/identity/domains",
          "authentication": "required",
          "requestBody": {
            "domain": { "type": "string", "required": true },
            "visibility": { "type": "enum", "values": ["PUBLIC", "PRIVATE"], "default": "PUBLIC" }
          }
        },
        "setAddress": {
          "method": "POST",
          "path": "/api/identity/address",
          "authentication": "required",
          "requestBody": {
            "street1": { "type": "string", "required": true },
            "street2": { "type": "string", "required": false },
            "city": { "type": "string", "required": true },
            "state": { "type": "string", "required": false },
            "postalCode": { "type": "string", "required": true },
            "country": { "type": "string", "required": true },
            "visibility": { "type": "enum", "values": ["PUBLIC", "PRIVATE"], "default": "PRIVATE" }
          }
        }
      },
      "verification": {
        "sendEmailVerification": {
          "method": "POST",
          "path": "/api/verify/email/send",
          "authentication": "required",
          "requestBody": { "emailId": { "type": "string", "required": true } }
        },
        "confirmEmailVerification": {
          "method": "POST",
          "path": "/api/verify/email/confirm",
          "authentication": "required",
          "requestBody": {
            "emailId": { "type": "string", "required": true },
            "code": { "type": "string", "required": true }
          }
        },
        "sendPhoneVerification": {
          "method": "POST",
          "path": "/api/verify/phone/send",
          "authentication": "required",
          "requestBody": { "phoneId": { "type": "string", "required": true } }
        },
        "confirmPhoneVerification": {
          "method": "POST",
          "path": "/api/verify/phone/confirm",
          "authentication": "required",
          "requestBody": {
            "phoneId": { "type": "string", "required": true },
            "code": { "type": "string", "required": true }
          }
        },
        "checkDomainVerification": {
          "method": "POST",
          "path": "/api/verify/domain/check",
          "authentication": "required",
          "description": "Check DNS TXT record or file for domain verification",
          "requestBody": { "domainId": { "type": "string", "required": true } }
        }
      },
      "providerCredentials": {
        "add": {
          "method": "POST",
          "path": "/api/identity/provider-credential",
          "authentication": "required",
          "description": "Add AI provider credential for verification",
          "requestBody": {
            "provider": { "type": "enum", "values": ["ANTHROPIC", "OPENAI", "GOOGLE", "META", "MISTRAL", "COHERE", "OTHER"], "required": true },
            "apiKey": { "type": "string", "required": true, "description": "Will be encrypted before storage" },
            "credentialType": { "type": "enum", "values": ["ADMIN_API_KEY", "OAUTH_TOKEN", "READ_ONLY_KEY"], "default": "ADMIN_API_KEY" }
          }
        },
        "delete": {
          "method": "DELETE",
          "path": "/api/identity/provider-credential/{id}",
          "authentication": "required",
          "description": "Remove a provider credential"
        }
      },
      "apiKeys": {
        "note": "API key management requires session authentication (cannot use API keys to manage API keys)",
        "list": {
          "method": "GET",
          "path": "/api/keys",
          "authentication": "session_only",
          "description": "List user's API keys",
          "response": {
            "keys": {
              "type": "array",
              "items": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "keyPrefix": { "type": "string", "description": "First 12 characters for identification" },
                "createdAt": { "type": "datetime" },
                "lastUsedAt": { "type": "datetime | null" },
                "expiresAt": { "type": "datetime | null" },
                "revokedAt": { "type": "datetime | null" }
              }
            }
          }
        },
        "create": {
          "method": "POST",
          "path": "/api/keys",
          "authentication": "session_only",
          "description": "Create a new API key. The full key is only shown once in the response.",
          "requestBody": {
            "name": { "type": "string", "required": true, "description": "Descriptive name for the key" },
            "expiresInDays": { "type": "integer | null", "required": false, "description": "Days until expiration (null = never)" }
          },
          "response": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "key": { "type": "string", "description": "Full API key (mk_xxx) - only shown once!" },
            "keyPrefix": { "type": "string" },
            "expiresAt": { "type": "datetime | null" },
            "createdAt": { "type": "datetime" }
          }
        },
        "delete": {
          "method": "DELETE",
          "path": "/api/keys/{id}",
          "authentication": "session_only",
          "description": "Revoke or permanently delete an API key",
          "parameters": {
            "id": { "type": "string", "in": "path", "required": true },
            "permanent": { "type": "boolean", "in": "query", "default": false, "description": "If true, permanently delete; otherwise just revoke" }
          },
          "response": {
            "success": { "type": "boolean" },
            "message": { "type": "string" }
          }
        }
      }
    },

    "dataModels": {
      "Content": {
        "id": "string (cuid)",
        "title": "string",
        "description": "string | null",
        "contentType": "HUMAN | AI | WITH_AI",
        "creatorName": "string",
        "originalUrl": "string | null",
        "thumbnailUrl": "string | null",
        "attribution": "string | null",
        "collaborators": "string[] (JSON)",
        "aiToolsUsed": "string[] (JSON)",
        "owner": "string | null",
        "userId": "string | null",
        "contentHash": "string | null (hex-encoded hash)",
        "hashAlgorithm": "SHA256 | SHA384 | SHA512 | SHA3_256 | SHA3_512 | BLAKE2B | BLAKE3 | MD5 | null",
        "hashTarget": "FILE | URL_CONTENT | TEXT_CONTENT | COMBINED | null",
        "hashCreatedAt": "datetime | null",
        "hashInputSize": "integer | null (bytes)",
        "hashInputFilename": "string | null",
        "gitCommitHash": "string | null (git commit SHA)",
        "gitRepositoryUrl": "string | null (repository URL)",
        "createdAt": "datetime",
        "updatedAt": "datetime"
      },
      "Identity": {
        "id": "string (cuid)",
        "userId": "string",
        "identityType": "INDIVIDUAL | CORPORATE | AI",
        "handle": "string | null (unique)",
        "displayName": "string | null",
        "bio": "string | null",
        "avatarUrl": "string | null",
        "aiConfig": "IdentityAIConfig | null (if AI)",
        "emails": "IdentityEmail[]",
        "phones": "IdentityPhone[]",
        "domains": "IdentityDomain[]",
        "mailingAddress": "MailingAddress | null",
        "providerCredentials": "ProviderCredential[]",
        "createdAt": "datetime",
        "updatedAt": "datetime"
      },
      "IdentityAIConfig": {
        "id": "string (cuid)",
        "identityId": "string",
        "provider": "ANTHROPIC | OPENAI | GOOGLE | META | MISTRAL | COHERE | OTHER",
        "model": "CLAUDE_OPUS | CLAUDE_SONNET | CLAUDE_HAIKU | GPT_4 | GPT_4_TURBO | GPT_4O | O1 | O1_MINI | GEMINI_PRO | GEMINI_ULTRA | LLAMA_3 | OTHER",
        "modelVersion": "string | null",
        "operatorId": "string | null (reference to operator Identity)",
        "providerVerified": "UNVERIFIED | PENDING | VERIFIED | FAILED",
        "providerVerifiedAt": "datetime | null"
      },
      "AIAttestation": {
        "id": "string (cuid)",
        "contributorId": "string",
        "requestId": "string (e.g., req_011CXHpqhqPeagN968JWobmN)",
        "sessionId": "string | null",
        "timestamp": "datetime",
        "provider": "AIProvider enum",
        "model": "AIModel enum",
        "modelVersion": "string | null",
        "source": "CLAUDE_CODE_LOG | API_RESPONSE | USER_SUBMITTED | PROVIDER_EXPORT | C2PA_METADATA | SYNTHID_DETECTED",
        "sourceDetail": "string | null",
        "level": "SELF_REPORTED | LOCAL_LOG | PROVIDER_CORROBORATED | PROVIDER_VERIFIED",
        "verifiedAt": "datetime | null",
        "verificationDetail": "string | null"
      },
      "ContentProvenance": {
        "id": "string (cuid)",
        "contentId": "string",
        "provenanceType": "C2PA | SYNTHID | ADOBE_CR | IPTC | EXIF | OTHER",
        "status": "DETECTED | NOT_DETECTED | TAMPERED | INVALID | PENDING",
        "c2paManifest": "string (JSON) | null - Full C2PA manifest data",
        "c2paClaimGenerator": "string | null - e.g., 'Adobe Photoshop 25.0'",
        "c2paSignature": "string | null",
        "c2paCertChain": "string (JSON) | null",
        "c2paIssuer": "string | null",
        "synthidConfidence": "float (0-1) | null",
        "synthidVersion": "string | null",
        "synthidProvider": "string | null",
        "detectedAt": "datetime",
        "generatorModel": "AIModel enum | null",
        "generatorProvider": "AIProvider enum | null",
        "rawMetadata": "string (JSON) | null",
        "verificationMethod": "string | null",
        "verificationUrl": "string | null",
        "verificationDetail": "string | null"
      }
    },

    "pages": {
      "/": "Home page with registration form (unauthenticated users)",
      "/register": "Content registration form (authenticated users)",
      "/dashboard": "User's content declarations dashboard",
      "/dashboard/api-keys": "API key management dashboard",
      "/declaration/{id}": "Public content declaration page with badge",
      "/settings/identity": "Identity settings and profile management",
      "/settings/identity/emails": "Manage email addresses",
      "/settings/identity/phones": "Manage phone numbers",
      "/settings/identity/domains": "Manage domains",
      "/settings/identity/address": "Manage mailing address",
      "/{handle}": "Public identity profile page",
      "/docs": "Human-readable documentation",
      "/docs/api.json": "Machine-readable API documentation (this document)"
    },

    "aiIntegration": {
      "claudeCodeLogs": {
        "description": "Claude Code stores request IDs in local logs that can be used for attestation",
        "logLocation": "~/.claude/projects/{project-path}/{session-id}.jsonl",
        "extractableFields": ["requestId", "sessionId", "timestamp", "model"],
        "example": {
          "requestId": "req_011CXHpqhqPeagN968JWobmN",
          "sessionId": "12245934-4934-4d56-b1f0-f757c7839a9f",
          "timestamp": "2026-01-20T02:16:38.802Z"
        }
      },
      "verificationFlow": [
        "1. Content is created with AI assistance",
        "2. User extracts requestId from local logs or API response",
        "3. User creates content declaration with AI contributor",
        "4. System stores attestation with requestId and metadata",
        "5. If provider credential is connected, system can cross-reference with usage data",
        "6. Attestation level is upgraded based on verification strength"
      ]
    },

    "contentProvenance": {
      "description": "Automatic detection of AI-generated content through embedded metadata and watermarks",
      "supportedFormats": ["PNG", "JPEG", "WebP", "TIFF"],
      "c2pa": {
        "description": "Coalition for Content Provenance and Authenticity - Industry standard cryptographic provenance",
        "howItWorks": [
          "1. User uploads image content for declaration",
          "2. System parses file for C2PA manifest (JUMBF box in JPEG, XMP in PNG)",
          "3. Extract claim_generator, signature, and certificate chain",
          "4. Validate signature against certificate chain",
          "5. Store verified provenance data linked to content",
          "6. Display provenance badge with generator info"
        ],
        "providers": {
          "OpenAI": "DALL-E 3 embeds C2PA metadata identifying OpenAI as creator",
          "Adobe": "Firefly, Photoshop, Lightroom embed Adobe Content Credentials",
          "Microsoft": "Designer and Copilot embed C2PA provenance",
          "Others": "Any C2PA-compliant tool's metadata will be recognized"
        },
        "verificationUrl": "https://contentcredentials.org/verify"
      },
      "synthid": {
        "description": "Google DeepMind's imperceptible pixel-level watermarking",
        "howItWorks": [
          "1. User uploads image for declaration",
          "2. System analyzes image pixels using SynthID detection model",
          "3. Detection returns confidence score (0-1)",
          "4. If confidence > threshold, mark as SynthID detected",
          "5. Store detection result with confidence level"
        ],
        "limitations": [
          "Requires access to SynthID detection model (Google-controlled)",
          "Only detects Google-generated images (Imagen, Gemini)",
          "May be degraded by image modifications (crop, resize, compression)"
        ],
        "note": "SynthID detection is rate-limited and may require API access from Google"
      },
      "euAiAct": {
        "description": "EU AI Act requires AI-generated content marking by August 2026",
        "requirement": "Article 50(2) requires providers to mark AI outputs in machine-readable format",
        "madebyCompliance": "MadeBy declarations and provenance detection help meet transparency requirements"
      }
    },

    "contentHashing": {
      "description": "Cryptographic hashing for content integrity verification",
      "purpose": [
        "Verify content hasn't been modified since declaration",
        "Detect tampering or unauthorized changes",
        "Create unique fingerprint for content identification",
        "Enable content-addressable lookups"
      ],
      "algorithms": {
        "recommended": "SHA256",
        "modern": ["SHA256", "SHA3_256", "BLAKE3"],
        "highSecurity": ["SHA512", "SHA3_512", "BLAKE2B"],
        "legacy": "MD5 (not recommended, collision-vulnerable)"
      },
      "hashTargets": {
        "FILE": "Hash the raw bytes of an uploaded file. Best for images, videos, documents.",
        "URL_CONTENT": "Hash the content fetched from originalUrl at declaration time.",
        "TEXT_CONTENT": "Hash the text/description field. Useful for text-only declarations.",
        "COMBINED": "Hash multiple elements together (e.g., title + description + file)."
      },
      "workflow": [
        "1. User uploads content file or provides URL",
        "2. System computes hash using selected algorithm",
        "3. Hash, algorithm, target, and metadata are stored with declaration",
        "4. Later verification: re-hash content and compare to stored hash",
        "5. Match confirms content integrity; mismatch indicates modification"
      ],
      "verificationExample": {
        "original": {
          "contentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "hashAlgorithm": "SHA256",
          "hashTarget": "FILE",
          "hashInputSize": 1048576,
          "hashInputFilename": "artwork.png"
        },
        "verification": "echo -n '<file-bytes>' | sha256sum"
      }
    }
  };

  return NextResponse.json(documentation, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
