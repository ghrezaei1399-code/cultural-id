# Comprehensive Project Document: "Global Smart Cultural Identity Card"

**Version:** 2.1 (Updated for Current Architecture)  
**Date:** 2026-09-01  
**Author:** Gholamreza Rezaei (Initiator & Initial Architect)  
**Status:** Reference Version in GitHub Repository

---

## 🧭 Chapter 1: Philosophy and Charter

### 1-1. Mission Statement
The "Global Smart Cultural Identity Card" is a decentralized, voluntary, and human-centered infrastructure that enables every individual to:
- Define their cultural identity based on their own values, knowledge, and interests (not nationality, race, or religion).
- Connect with like-minded people worldwide (without revealing personal information).
- Form cultural networks and, through the "Public Smart Radio-Television," produce and share group content.
- Share cultural achievements in a global gallery.

**Main Slogan:**  
*"Preserve cultural diversity; let people find their own cultural commonalities."*

---

### 1-2. Fundamental Principles (Unchangeable)
| Principle | Description |
| :--- | :--- |
| **No Permanent Ownership** | The founder steps down after 10,000 members, handing the project to the community. |
| **Transition to Decentralization** | Temporary centralized management, but architecture designed for gradual handover. |
| **Privacy-First** | No direct identifying data (name, ID, address, phone, location) is collected. |
| **Voluntary Participation** | All activities are optional; users can leave anytime. |
| **Non-Discrimination** | No culture, language, ethnicity, or belief is superior to another. |
| **Replicability** | Any group can launch their own version, provided they maintain these principles. |
| **Transparency** | Code is open, but user data remains private. |

---

## 🧩 Chapter 2: Conceptual Architecture and Protocol

### 2-1. Main System Components
| Layer | Description | Example |
| :--- | :--- | :--- |
| **User** | Person who registers. | A human with cultural values. |
| **Cultural Identity** | 7 cultural indicators selected by the user. | Indigenous values, individual knowledge, collective collaboration, ... |
| **Shared Networks** | Groups of users with common indicators. | "Everyone interested in Sustainable Peace and Cultural Unity." |
| **Cultural Content** | Works produced by users or groups. | Books, articles, podcasts, videos, posters. |
| **Publication Platform** | Public Smart Radio-Television for content sharing. | A dedicated channel for a cultural group. |

---

### 2-2. The 7 Cultural Indicators (Based on International Definitions)
| Indicator | Definition | International Source |
| :--- | :--- | :--- |
| **Indigenous Values** | Local beliefs, customs, and traditions shaping a community's identity. | UNESCO 2005 Convention |
| **Individual Knowledge** | Skills, knowledge, and abilities acquired over a lifetime. | UNESCO Universal Declaration on Cultural Diversity |
| **Collective Collaboration** | Ability to work in groups and participate in joint cultural projects. | Sustainable Development Goal 17 |
| **Cultural Diversity** | Respect and interest in different cultures and learning from them. | UNESCO Universal Declaration on Cultural Diversity |
| **Global Sustainable Peace** | Commitment to peace, dialogue, and conflict resolution through cultural means. | UNESCO Constitution |
| **Eliminate Violence** | Efforts to reduce prejudice, discrimination, and violence in societies. | UN Declaration on Human Rights Education |
| **Cultural Unity** | Building bridges between cultures for synergy. | UNESCO Intercultural Dialogue |

---

## 🛠️ Chapter 3: Technical Structure and Implementation

### 3-1. Technologies Used
| Technology | Purpose |
| :--- | :--- |
| **HTML, CSS, JavaScript** | Website development (no frameworks) |
| **Vercel (Serverless)** | Hosting and API functions |
| **GitHub API** | Data storage and retrieval |
| **JSON Files** | Data storage with limited access |
| **QR Code (JS-generated)** | QR code generation for each card |

---

### 3-2. System Modules

| Module | Description |
| :--- | :--- |
| **Registration & Card Issuance** | Users select 7 cultural values and receive a digital identity card. |
| **User Management (Admin)** | View, search, approve, and reject registered users. |
| **Cultural Achievements** | Users can upload achievements (with files) and admins can approve/reject them. |
| **Connection Requests** | Users can request connections with other members based on shared values. |
| **Tracking System** | Each request receives a unique tracking code for status checking. |
| **Achievements Gallery** | Public display of approved achievements with category filters. |
| **Smart Radio-Television** | Platform for group content publishing and cultural networks. |

---

### 3-3. Security and Privacy

| Feature | Description |
| :--- | :--- |
| **No Cookies** | No cookies or tracking on the site. |
| **No Third-Party Services** | No external analytics or tracking services. |
| **Limited Access** | User data is accessible only through secure APIs with token authentication. |
| **Deletable** | Users can request deletion of their data at any time. |
| **Private Emails** | User emails are only shared if a connection request is approved. |

---

### 3-4. Request Management Flow

| Step | Description |
| :--- | :--- |
| **1** | User submits a connection (or deletion) request. |
| **2** | System generates a unique tracking code and stores the request in `data/requests/`. |
| **3** | Admin reviews the request in the management panel. |
| **4** | If approved, the list of like-minded emails is stored in the user's file. |
| **5** | User can track the request status using the tracking code. |

---

### 3-5. Main APIs

| File | Endpoint | Description |
| :--- | :--- | :--- |
| `get-users.js` | `/api/get-users` | Get list of all users |
| `register.js` | `/api/register` | Register a new user |
| `upload-achievement.js` | `/api/upload-achievement` | Upload a new achievement |
| `submit-request.js` | `/api/submit-request` | Submit connection or deletion request |
| `approve-connection.js` | `/api/approve-connection` | Approve/reject request by admin |
| `get-connection-requests.js` | `/api/get-connection-requests` | Get list of all requests |
| `get-request-by-tracking.js` | `/api/get-request-by-tracking` | Get request status by tracking code |
| `update-user-status.js` | `/api/update-user-status` | Update user status by admin |

---

### 3-6. Smart Radio-Television Architecture

| Feature | Description |
| :--- | :--- |
| **Platform Type** | Decentralized content publishing for cultural groups |
| **Capabilities** | Text, audio, image, video |
| **Channels** | Each group (min 5 members) gets a dedicated channel |
| **Content Management** | Managed by the group itself |
| **AI Role** | Content suggestion, not human decision-making |
| **Card Integration** | Users participate in channels with their cultural identity |

---

## 🚀 Chapter 4: Roadmap and Future

### 4-1. Growth Stages
| Stage | Users | Status |
| :--- | :--- | :--- |
| 0 | 0-100 | Launch and initial testing |
| 1 | 100-1,000 | Early growth and community building |
| 2 | 1,000-10,000 | Network formation |
| 3 | 10,000+ | Full handover to the community |

### 4-2. Control Transition Mechanism (After 10,000 Members)
1. Temporary council formed (top 5 active users).  
2. Admin access transferred to the council.  
3. Permanent successor elected by community vote.  
4. Founder steps down from management role.  
5. All steps transparently recorded in GitHub.

---

## 📌 Appendix: International Outreach Guide

### Key Messages
1. This is not an identification system; it's a voluntary cultural map.  
2. No personal identifying information is collected.  
3. No culture is superior to another.  
4. All activities are optional.  
5. The project has no owner and will ultimately be handed over to the community.

---

**This document is the reference version of the "Global Smart Cultural Identity Card" project.**  
**Version 2.1 - Date: 2026-09-01**  
**Initiator:** Gholamreza Rezaei  
**Status:** Ready for replication and development by independent cultural networks.
